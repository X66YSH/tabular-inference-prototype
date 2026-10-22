import json
import unittest

import numpy as np
import pandas as pd

from tabular_inference_prototype.preprocessing import (
    inspect_dataset,
    prepare_features,
    suggest_feature_types,
    validate_target,
)


class InspectionTests(unittest.TestCase):
    def test_metadata_is_json_safe_and_identifies_common_types(self):
        frame = pd.DataFrame({
            "customer_id": ["0001", "0002", "0003", "0004", "0005"],
            "branch_code": [1, 2, 1, 2, 1],
            "amount": ["$1,234.50", "$45,000", None, "$5", "$10"],
            "date": ["2024-01-01", "2024-02-01", None, "2024-03-01", "2024-04-01"],
            "post_outcome": ["a", "a", "b", "b", "a"],
        })
        metadata = inspect_dataset(frame)
        json.dumps(metadata, allow_nan=False)
        self.assertEqual(metadata["rows"], 5)
        self.assertEqual(metadata["missing_values"]["amount"], 1)
        self.assertIn("amount", metadata["numerical_columns"])
        self.assertIn("date", metadata["date_columns"])
        self.assertIn("customer_id", metadata["categorical_columns"])
        warnings = " ".join(metadata["warnings"])
        self.assertIn("identifier", warnings)
        self.assertNotIn("category codes", warnings)
        self.assertIn("target leakage", warnings)
        self.assertEqual(suggest_feature_types(frame)["amount"]["detected_type"], "numeric")

    def test_unique_numeric_measurements_do_not_trigger_identifier_warnings(self):
        frame = pd.DataFrame({
            "income": [42_100, 51_200, 63_300, 74_400, 85_500],
            "balance": [103.15, 209.22, 301.38, 405.47, 501.52],
            "customer_age": [21, 32, 43, 54, 65],
            "account_balance": ["$1,100", "$2,200", "$3,300", "$4,400", "$5,500"],
            "email_open_rate": ["11%", "22%", "33%", "44%", "55%"],
            "phone_call_count": [10, 20, 30, 40, 50],
        })
        for name, details in suggest_feature_types(frame).items():
            with self.subTest(column=name):
                self.assertEqual(details["detected_type"], "numeric")
                self.assertEqual(details["warnings"], [])

    def test_numeric_identifiers_are_recognized_by_specific_column_names(self):
        frame = pd.DataFrame({
            name: [100_001, 100_002, 100_003, 100_004, 100_005]
            for name in ["customerID", "customerid", "AccountNumber", "account_number", "client_no", "tax_id", "SSN"]
        })
        for name, details in suggest_feature_types(frame).items():
            with self.subTest(column=name):
                self.assertEqual(details["detected_type"], "numeric")
                self.assertTrue(any("identifier" in warning for warning in details["warnings"]))

    def test_personal_field_names_are_flagged_without_unique_values(self):
        frame = pd.DataFrame({
            "fullName": ["Alex Smith"] * 5,
            "emailAddress": ["example@example.test"] * 5,
            "phoneNumber": ["+1 (416) 555-0100"] * 5,
            "home_address": ["100 Example Street"] * 5,
            "postalCode": ["A1A 1A1"] * 5,
        })
        for name, details in suggest_feature_types(frame).items():
            with self.subTest(column=name):
                self.assertTrue(any("personal information" in warning for warning in details["warnings"]))

    def test_unique_identifier_shaped_strings_are_flagged_with_neutral_names(self):
        frame = pd.DataFrame({
            "reference": [f"CUST-{index:04d}" for index in range(5)] + [None],
            "contact": [f"person{index}@example.test" for index in range(5)] + [None],
            "primary": [f"+1 (416) 555-010{index}" for index in range(5)] + [None],
        })
        for name, details in suggest_feature_types(frame).items():
            with self.subTest(column=name):
                self.assertTrue(any("identifier-like" in warning for warning in details["warnings"]))
                self.assertEqual(details["missing_values"], 1)

    def test_high_cardinality_and_long_text_are_review_hints(self):
        frame = pd.DataFrame({
            "region": [f"region{chr(97 + index)}" for index in range(20)],
            "notes": ["The customer contacted the branch to discuss the details of an upcoming renewal."] * 20,
            "segment": ["retail", "business"] * 10,
        })
        details = suggest_feature_types(frame)
        self.assertTrue(any("high cardinality" in warning for warning in details["region"]["warnings"]))
        self.assertTrue(any("free text" in warning for warning in details["notes"]["warnings"]))
        self.assertEqual(details["segment"]["warnings"], [])

    def test_integer_category_warnings_are_removed(self):
        frame = pd.DataFrame({"branch_code": [1, 2, 1, 2, 1], "tier": [1, 2, 3, 4, 5]})
        details = suggest_feature_types(frame)
        self.assertTrue(all(not column["warnings"] for column in details.values()))
        prepared, _, summary = prepare_features(frame, {"feature_types": {"branch_code": "categorical"}})
        self.assertEqual(prepared["branch_code"].tolist(), ["1", "2", "1", "2", "1"])
        self.assertEqual(summary["applied_feature_types"]["branch_code"], "categorical")

    def test_review_hints_do_not_exclude_features_or_change_row_alignment(self):
        context = pd.DataFrame({
            "customerID": [101, 102, 103, 104, 105],
            "notes": ["This is a longer customer note that should be reviewed before inference."] * 5,
        }, index=[9, 2, 7, 3, 5])
        query = pd.DataFrame({"customerID": [106], "notes": [None]}, index=[8])
        original = context.copy(deep=True)
        prepared, queries, summary = prepare_features(context, X_query=query)
        pd.testing.assert_frame_equal(prepared, original, check_dtype=False)
        pd.testing.assert_frame_equal(context, original)
        self.assertEqual(queries.index.tolist(), [8])
        self.assertEqual(queries.columns.tolist(), context.columns.tolist())
        self.assertEqual(summary["columns_excluded"], [])
        self.assertTrue(any("identifier" in warning for warning in summary["warnings"]))
        self.assertTrue(any("free text" in warning for warning in summary["warnings"]))

    def test_duplicate_columns_are_reported_then_rejected(self):
        frame = pd.DataFrame([[1, 2]], columns=["x", "x"])
        self.assertEqual(inspect_dataset(frame)["duplicate_columns"], ["x"])
        with self.assertRaisesRegex(ValueError, "Duplicate column"):
            prepare_features(frame)
        with self.assertRaisesRegex(ValueError, "Duplicate column"):
            validate_target(frame, "x")

    def test_size_thresholds_are_soft_and_configurable(self):
        frame = pd.DataFrame({"x": range(10)})
        _, _, summary = prepare_features(
            frame,
            {"size_warning_thresholds": {"small_rows": 2, "large_rows": 5}},
        )
        self.assertTrue(any("memory" in warning for warning in summary["warnings"]))
        self.assertFalse(any("less reliable" in warning for warning in summary["warnings"]))


class TargetValidationTests(unittest.TestCase):
    def test_prediction_preserves_missing_target_rows(self):
        frame = pd.DataFrame({"x": [1, 2, 3, 4], "label": ["yes", None, "no", None]})
        before = frame.copy(deep=True)
        summary = validate_target(frame, "label")
        self.assertEqual(summary["labeled_rows"], 2)
        self.assertEqual(summary["query_rows"], 2)
        self.assertEqual(summary["missing_target_rows_excluded"], 0)
        self.assertEqual(summary["class_count"], 2)
        pd.testing.assert_frame_equal(frame, before)
        json.dumps(summary, allow_nan=False)

    def test_evaluation_requires_fully_labeled_table(self):
        frame = pd.DataFrame({"x": [1, 2, 3], "label": ["yes", None, "no"]})
        with self.assertRaisesRegex(ValueError, "fully labeled"):
            validate_target(frame, "label", mode="evaluation")
        frame.loc[1, "label"] = "no"
        summary = validate_target(frame, "label", mode="evaluation")
        self.assertEqual(summary["labeled_rows"], 3)
        self.assertEqual(summary["query_rows"], 0)

    def test_prediction_requires_query_rows_and_enough_context(self):
        frame = pd.DataFrame({"x": [1, 2], "label": ["yes", "no"]})
        with self.assertRaisesRegex(ValueError, "missing target"):
            validate_target(frame, "label")
        frame.loc[1, "label"] = None
        with self.assertRaisesRegex(ValueError, "two labeled"):
            validate_target(frame, "label")

    def test_bad_target_and_single_class_are_rejected(self):
        frame = pd.DataFrame({"x": [1, 2, 3], "label": [1.0, 1.0, None]})
        with self.assertRaisesRegex(ValueError, "does not exist"):
            validate_target(frame, "missing")
        with self.assertRaisesRegex(ValueError, "two distinct"):
            validate_target(frame, "label")
        frame.loc[1, "label"] = 2
        self.assertEqual(validate_target(frame, "label")["class_count"], 2)

    def test_regression_target_is_distinguished_from_classification(self):
        frame = pd.DataFrame({"x": [1, 2, 3], "target": [1.25, 2.5, None]})
        with self.assertRaisesRegex(ValueError, "continuous targets"):
            validate_target(frame, "target")
        self.assertEqual(validate_target(frame, "target", "regression")["labeled_rows"], 2)
        frame.loc[0, "target"] = np.inf
        with self.assertRaisesRegex(ValueError, "finite numbers"):
            validate_target(frame, "target", "regression")

    def test_small_minority_classes_are_reported(self):
        frame = pd.DataFrame({"x": range(11), "target": ["a"] * 9 + ["b", None]})
        warnings = validate_target(frame, "target")["warnings"]
        self.assertTrue(any("few labeled examples" in warning for warning in warnings))


class FeaturePreparationTests(unittest.TestCase):
    def test_standard_features_missing_values_and_indices_are_preserved(self):
        context = pd.DataFrame(
            {"number": [1.5, np.nan], "category": pd.array(["red", None], dtype="string")},
            index=[8, 2],
        )
        query = pd.DataFrame({"number": [np.nan], "category": ["new"]}, index=[6])
        original = context.copy(deep=True)
        prepared, queries, summary = prepare_features(context, X_query=query)
        self.assertEqual(prepared.index.tolist(), [8, 2])
        self.assertEqual(queries.index.tolist(), [6])
        self.assertTrue(pd.isna(prepared.loc[2, "category"]))
        self.assertIsNot(prepared.loc[2, "category"], pd.NA)
        self.assertTrue(pd.isna(queries.loc[6, "number"]))
        self.assertEqual(queries.loc[6, "category"], "new")
        pd.testing.assert_frame_equal(context, original)
        self.assertTrue(summary["missing_values_preserved"])
        json.dumps(summary, allow_nan=False)

    def test_safe_currency_and_percentage_conversion(self):
        context = pd.DataFrame({
            "amount": ["$1,234.50", "$45,000", None],
            "rate": ["12.5%", "50%", None],
        })
        query = pd.DataFrame({"amount": ["$2,000"], "rate": ["25%"]}, index=[9])
        prepared, queries, summary = prepare_features(context, X_query=query)
        self.assertEqual(prepared.loc[0, "amount"], 1234.5)
        self.assertEqual(prepared.loc[1, "amount"], 45000)
        self.assertEqual(prepared.loc[0, "rate"], 0.125)
        self.assertEqual(queries.loc[9, "rate"], 0.25)
        self.assertTrue(pd.isna(prepared.loc[2, "rate"]))
        self.assertEqual({item["column"] for item in summary["columns_converted"]}, {"amount", "rate"})

    def test_ambiguous_numeric_formats_remain_categorical(self):
        frame = pd.DataFrame({
            "code": ["001", "002"],
            "mixed_units": ["10%", "10"],
            "mixed_currency": ["$10", "€10"],
            "grouping": ["1,23", "4,56"],
        })
        prepared, _, summary = prepare_features(frame)
        self.assertEqual(prepared.loc[0, "code"], "001")
        self.assertTrue(all(value == "categorical" for value in summary["applied_feature_types"].values()))

    def test_query_does_not_determine_or_silently_change_conversion_rules(self):
        context = pd.DataFrame({"value": ["10", "20"]})
        query = pd.DataFrame({"value": ["not numeric"]})
        with self.assertRaisesRegex(ValueError, "query column 'value'"):
            prepare_features(context, X_query=query)
        context = pd.DataFrame({"value": ["category", "20"]})
        query = pd.DataFrame({"value": ["30"]})
        prepared, queries, summary = prepare_features(context, X_query=query)
        self.assertEqual(summary["applied_feature_types"]["value"], "categorical")
        self.assertEqual(queries.loc[0, "value"], "30")
        self.assertEqual(prepared.loc[1, "value"], "20")

    def test_numeric_units_must_match_context(self):
        with self.assertRaisesRegex(ValueError, "percentage formatting"):
            prepare_features(
                pd.DataFrame({"rate": ["10%", "20%"]}),
                X_query=pd.DataFrame({"rate": ["30"]}),
            )
        with self.assertRaisesRegex(ValueError, "currency symbols"):
            prepare_features(
                pd.DataFrame({"amount": ["$10", "$20"]}),
                X_query=pd.DataFrame({"amount": ["€30"]}),
            )

    def test_categorical_override_and_exclusion_are_explicit(self):
        frame = pd.DataFrame({"branch_code": [1, 2, None], "customer_id": ["a", "b", "c"]})
        prepared, _, summary = prepare_features(
            frame,
            {"feature_types": {"branch_code": "categorical"}, "excluded_columns": ["customer_id"]},
        )
        self.assertEqual(prepared.columns.tolist(), ["branch_code"])
        self.assertEqual(prepared.loc[0, "branch_code"], "1.0")
        self.assertTrue(pd.isna(prepared.loc[2, "branch_code"]))
        self.assertEqual(summary["columns_excluded"], ["customer_id"])
        self.assertEqual(summary["applied_feature_types"]["branch_code"], "categorical")

    def test_date_expansion_preserves_missing_values_and_local_calendar(self):
        context = pd.DataFrame({"date": ["2024-01-01", None]})
        query = pd.DataFrame({"date": ["2024-02-29T23:00:00-05:00"]}, index=[8])
        prepared, queries, _ = prepare_features(context, X_query=query)
        self.assertEqual(prepared.columns.tolist(), ["date__year", "date__month", "date__weekday"])
        self.assertEqual(prepared.loc[0, "date__weekday"], 0)
        self.assertTrue(prepared.loc[1].isna().all())
        self.assertEqual(queries.loc[8, "date__month"], 2)
        self.assertEqual(queries.loc[8, "date__weekday"], 3)
        with self.assertRaisesRegex(ValueError, "query column 'date'"):
            prepare_features(context, X_query=pd.DataFrame({"date": ["not a date"]}))

    def test_all_excluded_invalid_overrides_and_date_collisions_fail_clearly(self):
        with self.assertRaisesRegex(ValueError, "At least one input feature"):
            prepare_features(pd.DataFrame({"x": [1]}), {"excluded_columns": ["x"]})
        with self.assertRaisesRegex(ValueError, "Unknown feature"):
            prepare_features(pd.DataFrame({"x": [1]}), {"excluded_columns": ["missing"]})
        with self.assertRaisesRegex(ValueError, "overrides"):
            prepare_features(pd.DataFrame({"x": [1]}), {"feature_types": {"x": "other"}})
        with self.assertRaisesRegex(ValueError, "collide"):
            prepare_features(pd.DataFrame({"date": ["2024-01-01"], "date__year": [2024]}))

    def test_mismatched_query_columns_and_infinite_numbers_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "same feature columns"):
            prepare_features(pd.DataFrame({"x": [1]}), X_query=pd.DataFrame({"y": [2]}))
        with self.assertRaisesRegex(ValueError, "finite"):
            prepare_features(pd.DataFrame({"x": [np.inf]}))


if __name__ == "__main__":
    unittest.main()
