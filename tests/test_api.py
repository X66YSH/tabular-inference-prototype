from datetime import datetime
from io import BytesIO, StringIO
import json
from pathlib import Path
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from tabular_inference_prototype.main import app, make_preview
from tabular_inference_prototype import model


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mixed = pd.DataFrame({
            "customer_id": [11, 12, 13, 14, 15, 16],
            "income": ["$1,200", "$1,500", "$900", "$800", "$700", "$2,000"],
            "region": ["ON", "QC", None, "BC", "ON", "AB"],
            "target": ["yes", None, "no", "yes", None, "no"],
        })

    def post(self, frame=None, *, filename="data.csv", **options):
        frame = self.mixed if frame is None else frame
        if filename.lower().endswith(".xlsx"):
            payload = BytesIO()
            frame.to_excel(payload, index=False)
            content = payload.getvalue()
        else:
            content = frame.to_csv(index=False).encode()
        data = {"target_column": "target", **options}
        return self.client.post("/predict", files={"file": (filename, content)}, data=data)

    def test_prediction_default_uses_every_label_and_preserves_original_positions(self):
        def infer(context, labels, query, **kwargs):
            self.assertEqual(context.index.tolist(), [0, 2, 3, 5])
            self.assertEqual(query.index.tolist(), [1, 4])
            self.assertEqual(labels.tolist(), ["yes", "no", "yes", "no"])
            self.assertNotIn("target", context.columns)
            self.assertEqual(context.columns.tolist(), query.columns.tolist())
            self.assertEqual(context["income"].tolist(), [1200, 900, 800, 2000])
            self.assertEqual(query["income"].tolist(), [1500, 700])
            self.assertEqual(kwargs["task_type"], "classification")
            return np.array(["no", "yes"])

        with patch("tabular_inference_prototype.main.run_prediction", side_effect=infer), patch(
            "tabular_inference_prototype.main.train_test_split",
            side_effect=AssertionError("Prediction must not split rows"),
        ):
            response = self.post()
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(result["mode"], "prediction")
        self.assertEqual(result["row_indices"], [1, 4])
        self.assertEqual(result["prediction"], ["no", "yes"])
        self.assertIsNone(result["metrics"])
        self.assertEqual(result["preprocessing"]["context_rows"], 4)
        self.assertEqual(result["preprocessing"]["missing_target_rows_excluded"], 0)
        exported = pd.read_csv(StringIO(result["download"]["content"]))
        self.assertEqual(exported["customer_id"].tolist(), self.mixed["customer_id"].tolist())
        self.assertEqual(exported["income"].tolist(), self.mixed["income"].tolist())
        self.assertEqual(exported[result["prediction_column"]].dropna().index.tolist(), [1, 4])
        self.assertEqual(exported["target"].isna().tolist(), self.mixed["target"].isna().tolist())
        self.assertEqual(
            exported[result["completed_target_column"]].tolist(),
            ["yes", "no", "no", "yes", "yes", "no"],
        )

    def test_xlsx_and_numeric_classification_labels(self):
        frame = self.mixed.assign(target=[0, None, 1, 1, None, 0])
        with patch("tabular_inference_prototype.main.run_prediction", return_value=np.array([1.0, 0.0])):
            response = self.post(frame, filename="DATA.XLSX")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["row_indices"], [1, 4])

    def test_evaluation_stratifies_and_returns_metrics_for_all_test_rows(self):
        frame = pd.DataFrame({"feature": range(100), "target": [0] * 70 + [1] * 30})

        def infer(context, labels, query, **kwargs):
            self.assertEqual(len(context), 80)
            self.assertEqual(len(query), 20)
            self.assertEqual(labels.value_counts().to_dict(), {0: 56, 1: 24})
            self.assertTrue(set(context.index).isdisjoint(query.index))
            self.assertEqual(set(context.index) | set(query.index), set(frame.index))
            self.assertNotIn("target", query.columns)
            return frame.loc[query.index, "target"].to_numpy()

        with patch("tabular_inference_prototype.main.run_prediction", side_effect=infer):
            response = self.post(frame, mode="evaluation")
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(len(result["prediction"]), 20)
        self.assertEqual(result["metrics"], {"accuracy": 1.0, "f1_macro": 1.0})
        self.assertEqual(result["preprocessing"]["split"]["strategy"], "stratified")
        self.assertEqual(result["row_indices"], sorted(result["row_indices"]))
        self.assertTrue(all(row["actual"] == row["prediction"] for row in result["predictions"]))
        exported = pd.read_csv(StringIO(result["download"]["content"]))
        self.assertEqual(len(exported), 100)
        self.assertEqual(exported[result["prediction_column"]].dropna().index.tolist(), result["row_indices"])

    def test_sample_dataset_remains_supported_in_evaluation(self):
        frame = pd.read_csv(Path(__file__).resolve().parents[1] / "sample_customers.csv")
        with patch(
            "tabular_inference_prototype.main.run_prediction",
            side_effect=lambda context, labels, query, **kwargs: np.zeros(len(query), dtype=int),
        ):
            response = self.post(frame, target_column="default", mode="evaluation")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()["prediction"]), 80)

    def test_non_stratified_fallback_is_explicit_when_context_retains_classes(self):
        frame = pd.DataFrame({"feature": range(5), "target": ["a", "a", "a", "a", "b"]})
        with patch("tabular_inference_prototype.main.run_prediction", return_value=np.array(["a"])):
            response = self.post(frame, mode="evaluation")
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(result["preprocessing"]["split"]["strategy"], "random")
        self.assertTrue(any("unstratified" in warning for warning in result["preprocessing"]["warnings"]))

    def test_evaluation_rejects_split_that_loses_a_class(self):
        frame = pd.DataFrame({"feature": range(5), "target": ["a", "b", "a", "a", "a"]})
        with patch("tabular_inference_prototype.main.run_prediction") as infer:
            response = self.post(frame, mode="evaluation")
        self.assertEqual(response.status_code, 400)
        self.assertIn("class without labeled context", response.json()["detail"])
        infer.assert_not_called()

    def test_regression_prediction_and_evaluation(self):
        frame = pd.DataFrame({"feature": range(10), "target": np.arange(10) * 1.5})
        with patch(
            "tabular_inference_prototype.main.run_prediction",
            side_effect=lambda context, labels, query, **kwargs: query["feature"].to_numpy() * 1.5,
        ) as infer:
            response = self.post(frame, mode="evaluation", task_type="regression")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["metrics"], {"mae": 0.0, "rmse": 0.0, "r2": 1.0})
            self.assertEqual(infer.call_args.kwargs["task_type"], "regression")
            frame.loc[[1, 8], "target"] = np.nan
            response = self.post(frame, task_type="regression")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["prediction"], [1.5, 12.0])
        self.assertIsNone(response.json()["metrics"])

    def test_invalid_workflow_inputs_fail_before_inference(self):
        cases = [
            (self.mixed, {"mode": "evaluation"}, "fully labeled"),
            (self.mixed.fillna({"target": "yes"}), {}, "missing target"),
            (self.mixed.assign(target=None), {}, "two labeled"),
            (self.mixed.assign(target=["yes", None, "yes", "yes", None, "yes"]), {}, "two distinct"),
            (self.mixed, {"target_column": "absent"}, "does not exist"),
            (self.mixed, {"mode": "invalid"}, "mode"),
            (self.mixed, {"task_type": "invalid"}, "task_type"),
            (self.mixed, {"excluded_columns": '["target"]'}, "target column"),
            (self.mixed, {"excluded_columns": "{}"}, "JSON array"),
            (self.mixed, {"feature_types": "{"}, "valid JSON"),
            (self.mixed, {"feature_types": '{"income": []}'}, "numeric"),
            (self.mixed, {"excluded_columns": '["customer_id", "income", "region"]'}, "one input feature"),
        ]
        for frame, options, error in cases:
            with self.subTest(options=options, error=error), patch(
                "tabular_inference_prototype.main.run_prediction"
            ) as infer:
                response = self.post(frame, **options)
                self.assertEqual(response.status_code, 400, response.text)
                self.assertIn(error, response.json()["detail"])
                infer.assert_not_called()

    def test_feature_exclusions_and_overrides(self):
        def infer(context, labels, query, **kwargs):
            self.assertEqual(context.columns.tolist(), ["income", "region"])
            self.assertEqual(context["income"].tolist(), ["$1,200", "$900", "$800", "$2,000"])
            self.assertEqual(query["income"].tolist(), ["$1,500", "$700"])
            return np.array(["no", "yes"])

        with patch("tabular_inference_prototype.main.run_prediction", side_effect=infer):
            response = self.post(
                excluded_columns='["customer_id"]', feature_types='{"income":"categorical"}'
            )
        self.assertEqual(response.status_code, 200, response.text)

    def test_duplicate_headers_are_reported_without_silent_renaming(self):
        for extension in ("csv", "xlsx"):
            frame = pd.DataFrame([[1, 2, "yes"], [3, 4, "no"], [5, 6, None]], columns=["x", "x", "target"])
            if extension == "csv":
                content = frame.to_csv(index=False).encode()
            else:
                buffer = BytesIO()
                frame.to_excel(buffer, index=False)
                content = buffer.getvalue()
            inspected = self.client.post("/inspect", files={"file": (f"data.{extension}", content)})
            self.assertEqual(inspected.status_code, 200)
            self.assertEqual(inspected.json()["duplicate_columns"], ["x"])
            response = self.post(frame, filename=f"data.{extension}")
            self.assertEqual(response.status_code, 400)
            self.assertIn("Duplicate column", response.json()["detail"])

    def test_invalid_upload_and_missing_checkpoint_errors(self):
        for filename, content in (("data.txt", b"hello"), ("data.csv", b""), ("data.xlsx", b"invalid")):
            response = self.client.post("/inspect", files={"file": (filename, content)})
            self.assertEqual(response.status_code, 400, response.text)
        with patch("tabular_inference_prototype.main.run_prediction", side_effect=FileNotFoundError):
            response = self.post()
        self.assertEqual(response.status_code, 503)
        self.assertIn("downloads are disabled", response.json()["detail"])

    def test_prediction_column_collisions_do_not_overwrite_uploaded_values(self):
        frame = self.mixed.assign(target_prediction="existing", target_completed="original")
        with patch("tabular_inference_prototype.main.run_prediction", return_value=np.array(["no", "yes"])):
            response = self.post(frame)
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        exported = pd.read_csv(StringIO(result["download"]["content"]))
        self.assertEqual(result["prediction_column"], "target_prediction_2")
        self.assertEqual(result["completed_target_column"], "target_completed_2")
        self.assertTrue((exported["target_prediction"] == "existing").all())
        self.assertTrue((exported["target_completed"] == "original").all())

    def test_blank_csv_rows_remain_query_rows(self):
        content = b"x,target\n1,a\n,\n3,b\n"
        with patch("tabular_inference_prototype.main.run_prediction", return_value=np.array(["a"])):
            response = self.client.post(
                "/predict", files={"file": ("data.csv", content)}, data={"target_column": "target"}
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["row_indices"], [1])

    def test_csv_codes_and_numeric_looking_headers_keep_leading_zeros(self):
        content = b"001,target\n001,a\n002,\n003,b\n"

        def infer(context, labels, query, **kwargs):
            self.assertEqual(context["001"].tolist(), ["001", "003"])
            self.assertEqual(query["001"].tolist(), ["002"])
            return np.array(["a"])

        with patch("tabular_inference_prototype.main.run_prediction", side_effect=infer):
            response = self.client.post(
                "/predict", files={"file": ("codes.csv", content)}, data={"target_column": "target"}
            )
        self.assertEqual(response.status_code, 200, response.text)
        exported = pd.read_csv(StringIO(response.json()["download"]["content"]), dtype=str)
        self.assertEqual(exported["001"].tolist(), ["001", "002", "003"])

    def test_extra_csv_fields_cannot_be_silently_used_as_an_index(self):
        for content in (
            b"feature,target\n0,10,a\n1,20,b\n2,30,\n",
            b"feature,target\n1,10,a\n2,20,b\n3,30,\n",
        ):
            response = self.client.post("/inspect", files={"file": ("invalid.csv", content)})
            self.assertEqual(response.status_code, 400, response.text)

    def test_xlsx_string_codes_keep_leading_zeros(self):
        frame = self.mixed.rename(columns={"customer_id": "001"}).assign(
            **{"001": ["001", "002", "003", "004", "005", "006"]}
        )
        with patch("tabular_inference_prototype.main.run_prediction", return_value=np.array(["no", "yes"])):
            response = self.post(frame, filename="codes.xlsx")
        self.assertEqual(response.status_code, 200, response.text)
        exported = pd.read_csv(StringIO(response.json()["download"]["content"]), dtype=str)
        self.assertEqual(exported["001"].tolist(), frame["001"].tolist())

    def test_large_integer_strings_are_not_rounded_when_missing_values_exist(self):
        frame = self.mixed.assign(customer_id=["9007199254740993", None, "9007199254740995", "9007199254740997", None, "9007199254740999"])
        with patch("tabular_inference_prototype.main.run_prediction", return_value=np.array(["no", "yes"])):
            response = self.post(frame)
        self.assertEqual(response.status_code, 200, response.text)
        exported = pd.read_csv(StringIO(response.json()["download"]["content"]), dtype=str)
        self.assertEqual(exported["customer_id"].dropna().tolist(), frame["customer_id"].dropna().tolist())
        self.assertEqual(response.json()["preprocessing"]["applied_feature_types"]["customer_id"], "categorical")

    def test_nonfinite_model_outputs_return_clear_errors(self):
        frame = self.mixed.assign(target=[1.2, None, 3.4, 2.2, None, 6.5])
        for predictions in (np.array([np.nan, 2.0]), np.array([np.inf, 2.0])):
            with patch("tabular_inference_prototype.main.run_prediction", return_value=predictions):
                response = self.post(frame, task_type="regression")
            self.assertEqual(response.status_code, 503, response.text)


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def upload(self, frame, *, extension="csv", endpoint="/preview", **options):
        if extension == "xlsx":
            payload = BytesIO()
            frame.to_excel(payload, index=False)
            content = payload.getvalue()
        else:
            content = frame.to_csv(index=False).encode()
        return self.client.post(endpoint, files={"file": (f"data.{extension}", content)}, data=options)

    def test_inspect_keeps_metadata_and_adds_first_raw_page(self):
        frame = pd.DataFrame({"code": [f"{index:04d}" for index in range(120)], "balance": ["1.2300"] * 120})
        for extension in ("csv", "xlsx"):
            with self.subTest(extension=extension):
                response = self.upload(frame, extension=extension, endpoint="/inspect")
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertEqual(result["rows"], 120)
                self.assertEqual(result["numerical_columns"], ["balance"])
                self.assertEqual(result["categorical_columns"], ["code"])
                self.assertEqual(result["missing_values"], {"code": 0, "balance": 0})
                preview = result["preview"]
                self.assertEqual(preview["columns"], ["code", "balance"])
                self.assertEqual(preview["total_rows"], 120)
                self.assertEqual(preview["filtered_rows"], 120)
                self.assertEqual(preview["offset"], 0)
                self.assertEqual(preview["limit"], 50)
                self.assertEqual(len(preview["rows"]), 50)
                self.assertEqual(preview["rows"][0], {"row_index": 0, "values": ["0000", "1.2300"], "missing": [False, False]})

    def test_csv_and_xlsx_pagination_can_browse_every_original_row(self):
        frame = pd.DataFrame({"value": range(207), "target": ["known"] * 207})
        for extension in ("csv", "xlsx"):
            with self.subTest(extension=extension):
                positions = []
                for offset in (0, 100, 200):
                    response = self.upload(frame, extension=extension, offset=offset, limit=100)
                    self.assertEqual(response.status_code, 200, response.text)
                    result = response.json()
                    self.assertEqual(result["total_rows"], 207)
                    self.assertEqual(result["filtered_rows"], 207)
                    self.assertEqual(result["offset"], offset)
                    self.assertLessEqual(len(result["rows"]), 100)
                    positions.extend(row["row_index"] for row in result["rows"])
                self.assertEqual(positions, list(range(207)))
                self.assertEqual(self.upload(frame, extension=extension, offset=300).json()["rows"], [])

    def test_missing_filters_match_inference_and_preserve_whitespace_labels(self):
        frame = pd.DataFrame({
            "feature": range(10),
            "target": ["a", None, "NA", "null", "   ", " NaN ", "b", "", "\t", "<NA>"],
        })
        expected_missing = [1, 2, 3, 7, 9]
        expected_labeled = [0, 4, 5, 6, 8]
        for extension in ("csv", "xlsx"):
            with self.subTest(extension=extension):
                response = self.upload(frame, extension=extension)
                self.assertEqual(response.status_code, 200, response.text)
                rows = response.json()["rows"]
                self.assertEqual([row["row_index"] for row in rows if row["missing"][1]], expected_missing)
                self.assertTrue(all(rows[index]["values"][1] is None for index in expected_missing))
                self.assertEqual([rows[index]["values"][1] for index in [4, 5, 8]], ["   ", " NaN ", "\t"])
                for row_filter, positions in (("missing", expected_missing), ("labeled", expected_labeled)):
                    filtered = self.upload(frame, extension=extension, target_column="target", row_filter=row_filter).json()
                    self.assertEqual(filtered["filtered_rows"], len(positions))
                    self.assertEqual([row["row_index"] for row in filtered["rows"]], positions)
                with patch("tabular_inference_prototype.main.run_prediction", return_value=np.array(["a"] * 5)) as infer:
                    predicted = self.upload(frame, extension=extension, endpoint="/predict", target_column="target")
                self.assertEqual(predicted.status_code, 200, predicted.text)
                self.assertEqual(predicted.json()["row_indices"], expected_missing)
                self.assertEqual(infer.call_args.args[0].index.tolist(), expected_labeled)

    def test_original_row_filter_intersects_target_filter_before_pagination(self):
        frame = pd.DataFrame({"value": range(6), "target": ["a", None, "b", "a", None, "b"]})
        result = self.upload(frame, row_indices="[4,0,1]", target_column="target", row_filter="missing", offset=1, limit=1).json()
        self.assertEqual(result["total_rows"], 6)
        self.assertEqual(result["filtered_rows"], 2)
        self.assertEqual([row["row_index"] for row in result["rows"]], [4])
        result = self.upload(frame, row_indices="[5,1,3]").json()
        self.assertEqual([row["row_index"] for row in result["rows"]], [1, 3, 5])
        empty = self.upload(frame, row_indices="[]").json()
        self.assertEqual(empty["filtered_rows"], 0)
        self.assertEqual(empty["rows"], [])

    def test_preview_preserves_csv_strings_and_blank_row_positions(self):
        content = (
            b"code,balance,scientific,large,note,target\n"
            b"001,1.2300,1e+03,9007199254740993,  keep spaces  ,a\n"
            b"\n"
            b"003,+2.00,2E-03,9007199254740995,   ,b\n"
        )
        response = self.client.post("/preview", files={"file": ("data.csv", content)})
        self.assertEqual(response.status_code, 200, response.text)
        rows = response.json()["rows"]
        self.assertEqual(rows[0]["values"], ["001", "1.2300", "1e+03", "9007199254740993", "  keep spaces  ", "a"])
        self.assertEqual(rows[1], {"row_index": 1, "values": [None] * 6, "missing": [True] * 6})
        self.assertEqual(rows[2]["values"][4], "   ")
        self.assertFalse(rows[2]["missing"][4])

    def test_excel_native_values_are_json_safe_and_do_not_lose_browser_precision(self):
        frame = pd.DataFrame({
            "code": ["001", "002"],
            "large_text": ["9007199254740993", None],
            "large_number": [10**16, 10**16],
            "when": [datetime(2024, 2, 29, 15, 45), None],
            "flag": [True, False],
            "amount": [1.25, 2.5],
        })
        response = self.upload(frame, extension="xlsx")
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        json.dumps(result, allow_nan=False)
        self.assertEqual(result["rows"][0]["values"], ["001", "9007199254740993", "10000000000000000", "2024-02-29T15:45:00", True, 1.25])
        self.assertEqual(result["rows"][1]["missing"], [False, True, False, True, False, False])

    def test_nonfinite_preview_values_do_not_become_missing_labels(self):
        result = make_preview(pd.DataFrame({"value": [np.inf, -np.inf, np.nan]}))
        json.dumps(result, allow_nan=False)
        self.assertEqual([row["values"][0] for row in result["rows"]], ["inf", "-inf", None])
        self.assertEqual([row["missing"][0] for row in result["rows"]], [False, False, True])

    def test_duplicate_headers_remain_visible_but_cannot_be_an_ambiguous_target(self):
        frame = pd.DataFrame([["001", "002", "a"], ["003", "004", None]], columns=["code", "code", "target"])
        for extension in ("csv", "xlsx"):
            with self.subTest(extension=extension):
                response = self.upload(frame, extension=extension, endpoint="/inspect")
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertEqual(result["duplicate_columns"], ["code"])
                self.assertEqual(result["preview"]["columns"], ["code", "code", "target"])
                self.assertEqual(result["preview"]["rows"][0]["values"], ["001", "002", "a"])
                invalid = self.upload(frame, extension=extension, target_column="code", row_filter="missing")
                self.assertEqual(invalid.status_code, 400, invalid.text)
                self.assertIn("duplicate", invalid.json()["detail"])
                valid = self.upload(frame, extension=extension, target_column="target", row_filter="missing")
                self.assertEqual([row["row_index"] for row in valid.json()["rows"]], [1])

    def test_invalid_pagination_filters_and_row_positions_fail_clearly(self):
        frame = pd.DataFrame({"value": [1, 2], "target": ["a", None]})
        for options in ({"offset": -1}, {"offset": "bad"}, {"limit": 0}, {"limit": 101}, {"row_filter": "query"}):
            with self.subTest(options=options):
                self.assertEqual(self.upload(frame, **options).status_code, 422)
        for options in (
            {"row_filter": "missing"}, {"row_filter": "labeled"}, {"target_column": "absent"},
            *({"row_indices": value} for value in ("{", "{}", "null", '["1"]', "[true]", "[1.0]", "[-1]", "[2]", "[0,0]")),
        ):
            with self.subTest(options=options):
                response = self.upload(frame, **options)
                self.assertEqual(response.status_code, 400, response.text)
                self.assertTrue(response.json()["detail"])


class ModelConfigurationTests(unittest.TestCase):
    def test_both_estimators_use_local_checkpoints_and_disable_downloads(self):
        context = pd.DataFrame({"x": [1, 2]})
        labels = pd.Series([0, 1])
        query = pd.DataFrame({"x": [3]})
        for task_type, estimator_name, path in (
            ("classification", "TabICLClassifier", model.MODEL_PATH),
            ("regression", "TabICLRegressor", model.REGRESSION_MODEL_PATH),
        ):
            with self.subTest(task_type=task_type), patch.object(
                model, estimator_name
            ) as estimator, patch.object(Path, "is_file", return_value=True):
                model.run_prediction(context, labels, query, task_type=task_type)
                estimator.assert_called_once_with(model_path=path, allow_auto_download=False)
                estimator.return_value.fit.assert_called_once_with(context, labels)
                estimator.return_value.predict.assert_called_once_with(query)


if __name__ == "__main__":
    unittest.main()
