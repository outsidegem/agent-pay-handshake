export var PaymentState;
(function (PaymentState) {
    PaymentState["PAYMENT_REQUIRED"] = "PAYMENT_REQUIRED";
    PaymentState["PAYMENT_PRESENT"] = "PAYMENT_PRESENT";
    PaymentState["PAYMENT_AUTHENTIC"] = "PAYMENT_AUTHENTIC";
    PaymentState["PAYMENT_VERIFIED"] = "PAYMENT_VERIFIED";
    PaymentState["PAYMENT_SETTLED"] = "PAYMENT_SETTLED";
    PaymentState["PAYMENT_REJECTED"] = "PAYMENT_REJECTED";
})(PaymentState || (PaymentState = {}));
