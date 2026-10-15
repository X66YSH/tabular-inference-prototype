from tabicl import TabICLClassifier

def run_prediction(X_train, y_train, X_test):
    model = TabICLClassifier()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    return predictions