# Payfast Developer Documentation - API Reference (rendered, full page)

Source: https://developers.payfast.co.za/api

---

API
​
Dev Docs
Support
Sign Up
Introduction
Authentication
Errors
Recurring Billing
Transaction history
Credit card transaction query
Refunds
System Status
Introduction
All API communications with Payfast are organized around REST. Our API has predictable resource-oriented URLs, returns JSON-encoded responses and uses standard HTTP response codes and verbs.

Account Setup:

Login to your merchant account and make sure that the following is setup:

A passphrase as set on the settings page (see Authentication below)
Payfast merchant ID
The version of the API you want to interact with


IP Whitelisting



Each request to the Recurring Billing API may be controlled by an IP address whitelist. If set, the IP address of the server completing the API call must be in the given list, else the action will not be processed. The whitelist can be set on the merchant’s settings page and is an optional security setting.

Go to RECURRING BILLING and edit the IP Whitelist.

The Payfast API and integration can be tested through the sandbox.
You can also use Payfast's POSTMAN API collection.
BASE URL
https://api.payfast.co.za 
Outline of a JSON formatted response:
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
}
}
code: The HTTP status code for the result
status: A more verbose description of the result
data: Will contain a response of either true or false for the action and may also contain one or more description(s) for the reason of the result
Request body

Variables may be sent via both the headers and body of each request as specified.
Sending data to the API may be done in one of two ways:

application/x-www-form-urlencoded
Essentially one big query string where all name / value pairs are separated by the ‘&’ symbol, with an equal (=) symbol between name and value. This is similar to submitting the traditional HTML FORM via POST (eg. frequency=3&cycles=12…).


application/json
Fields should be passed in as a single-level JSON representation.
See the JSON request example
JSON Request
{"frequency" : 3,"cycles" : 12} 
Request Timestamp



Each request to the API must contain an ISO-8601 formatted timestamp. This field must be present in each request body along with the signature. Failure to include this field will result in an error. The timestamp field must be formatted according to ISO-8601 standards, and be in the following format:

YYYY-MM-DDTHH:MM[(+-)HH:MM] (e.g. 2020-04-01T12:00:01+02:00)

The time zone offset group ((+-)HH:MM) is optional. If not included, the default will be assumed to be GMT +2.

Request timestamp
timestamp: 2020-02-01T12:00:01+02:00 
Ping API response

Used to check if the API is responding to requests.

Parameters
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
GET /ping
https://api.payfast.co.za/ping 

Live response:

RESPONSE
"Payfast API"

Sandbox response:

RESPONSE
"API V1"
Authentication

Data integrity is ensured through a signature together with passphrase passed in the header of all requests.

Merchant Passphrase

The passphrase is used to salt the signature (as described below).
The passphrase is considered a secret between the merchant and Payfast and should never be sent or given out.

The merchant may set their own passphrase by:

Login to Payfast using their merchant credentials.
Clicking on "Settings", and then "Edit" under the Security Pass Phrase section.
Inputting the desired passphrase and click "Update"
A passphrase must be set by the merchant before any API interaction is allowed
Signature Generation:

A generated MD5 signature must be passed in the header of the request and this hash is used to ensure the integrity of the data transfer.

Signature generation steps

Sort all the submitted variables (header, body, query string parameters and passphrase) in alphabetical order.
NOTE: When in test mode the testing parameter should be excluded from the signature.
Create a string by concatenating all the non-empty, sorted variables, with ‘&’ used as a separator.
Each value should also be urlencoded (eg. “merchant-id=10000100&passphrase=​passphrase&..&version=v1”)
Make sure there is no trailing '&'
MD5 hash your string.
Variable order: The pairs must be listed in alphabetical order eg. email_address=john@doe.com&​name_first=John&name_last=Doe
* Do not use the custom payment signature format, which requires pairs to be listed in the order in which they appear in the documentation!
Signature generation
Select library
<?php
/**
 * Generate signature for API
 * @param array $pfData (all of the header, body and query string param values to be sent to the API)
 * @param null $passPhrase
 * @return string
 */
function generateApiSignature($pfData, $passPhrase = null) {

    if ($passPhrase !== null) {
        $pfData['passphrase'] = $passPhrase;
    }

    // Sort the array by key, alphabetically
    ksort($pfData);

    //create parameter string
    $pfParamString = http_build_query($pfData);
    return md5($pfParamString);
} 
Errors

Payfast uses conventional HTTP response codes to indicate the type of failure of an API request.

In general: Codes in the 4xx range indicate an error that failed given the information provided (e.g., a required parameter was omitted, a charge failed, etc.). 

Some 4xx errors that could be handled programmatically (e.g., a card is declined) include an error code that briefly explains the error reported.

Codes in the 5xx range indicate a Payfast networking or application error.

Parameters
code
stringOPTIONAL
The HTTP response code
status
stringOPTIONAL
A more verbose description of the error
data
hashOPTIONAL
Will contain a response of false for the action and may also contain one or more description(s) for the reason of the result
RESPONSE
{
"code":
400,
"status":
"failed",
"data":
{
"response":
false,
"message":
"Failure"
}
}
ERROR CODES
400 - Required variables not present in request	The request is missing some or all of the required fields.
400 - Value for signature is not in the expected format	Generated when the merchant signature provided is not an MD5 hash, or is malformed.
400 - API version is not valid	Issued when the version header refers to a version that does not exist, or is malformed.
400 - Signature not present in headers	The signature has not been provided.
401 - Merchant not found	The given merchant ID was not found.
401 - Request origin not recognised	Generated when the request does not contain a REMOTE_ADDR value.
401 - Request origin could not be verified	Occurs when the request is made from a location not specified in the whitelist.
401 - Merchant authorisation failed	The signature is incorrect.
404 - Service / endpoint not found	The endpoint does not exist or the requesting merchant does not have permission to access.
429 - Signature rate limit reached, please try again in a few minute	The rate limit was hit.
500 - Application Error	Application Error.
500 - Communication Failure	Networking issue with the API.
Recurring Billing

The Subscription Payments API gives Merchants the ability to interact with subscriptions on their accounts.

URLs to interact with take the following form:
https://api.payfast.co.za/subscriptions/​[token]/[action]

Sandbox:
https://api.payfast.co.za/subscriptions/​[token]/[action]?testing=true

Related Guide: Recurring Billing

Endpoints
GET /subscriptions/:token/fetch
PUT /subscriptions/:token/pause
PUT /subscriptions/:token/unpause
PUT /subscriptions/:token/cancel
PATCH /subscriptions/:token/update
POST /subscriptions/:token/adhoc
 
The subscription object

This is the object representing your subscription.
You can retrieve it to see the details of your subscription.

Parameters
token
stringREQUIRED
Path, the Unique ID on Payfast that represents the subscription.
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
GET /subscriptions/:token/fetch
https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/fetch 
RESPONSE (RECURRING)
{
"code":
200,
"status":
"success",
"data":
{
"response":
{
"amount":
1628,
"cycles":
14,
"cycles_complete":
9,
"frequency":
3,
"run_date":
"2020-07-04T00:00:00+02:00",
"status":
1,
"status_reason":
"",
"status_text":
"ACTIVE",
"token":
"a3b3ae55-ab8b-b388-df23-4e6882b86ce0"
}
}
}
RESPONSE (TOKENIZATION)
{
"code":
200,
"status":
"success",
"data":
{
"response":
{
"status":
1,
"status_reason":
"",
"status_text":
"ACTIVE"
}
}
}
Pause a subscription

Should a subscription be paused the remaining payments (cycles) will remain untouched. The end date of the subscription moves on by the number of paused frequency period(s). Effectively the customer gains a payment gap and the number of payments will still be the same as originally requested. A free month(s) could be provided by pausing (pause) a subscription and reducing the number of cycles by making an update to the subscription.

Parameters
token
stringREQUIRED
Path, the Unique ID on Payfast that represents the subscription.
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
cycles
integerOPTIONAL
Body, number of cycles to pause the subscription for. Default is 1 if not given.
PUT /subscriptions/:token/pause
https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/pause 
cURL Example
curl -v -X PUT -H “merchant-id: 10000100” -H “version: v1” -H “timestamp=2016-04-01T12:00:01” -H “signature=840654b40a8b312e54650e1613696b44” https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/pause 
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
true
}
}
Unpause a subscription

Unpause a subscription.

Parameters
token
stringREQUIRED
Path, the Unique ID on Payfast that represents the subscription.
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
PUT /subscriptions/:token/unpause
https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/unpause 
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
true
}
}
Cancel a subscription

This will cancel a subscription entirely.
When a subscription is cancelled the customer will be notified of this via email.

Parameters
token
stringREQUIRED
Path, the Unique ID on Payfast that represents the subscription.
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
PUT /subscriptions/:token/cancel
https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/cancel 
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
true
}
}
Update a subscription

This allows for multiple subscription values to be updated.

The body must contain at least one of the optional payload variables.
Parameters
token
stringREQUIRED
Path, the Unique ID on Payfast that represents the subscription.
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
cycles
integerOPTIONAL
Body, the number of cycles for the subscription.
frequency
integerOPTIONAL
Body, the frequency for the subscription:
1 - Daily
2 - Weekly
3 - Monthly
4 - Quarterly
5 - Biannual
6 - Annual
run_date
YYYY-MM-DDOPTIONAL
Body, the next run date for the subscription.
amount
integerOPTIONAL
Body, the amount which the buyer must pay, in cents (ZAR).
PATCH /subscriptions/:token/update
https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/update 
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
{
"token":
"a3b3ae55-ab8b-b388-df23-4e6882b86ce0",
"amount":
1628,
"cycles":
14,
"cycles_complete":
9,
"frequency":
3,
"status":
1,
"run_date":
"2016-07-04"
}
}
}
Charge a tokenization payment

Charge a tokenization payment based on the token provided.
When receiving the API call to charge a customer's credit card via a token, Payfast will attempt to charge the card immediately. If the credit card is out of funds a failed response will be returned.

Parameters
token
stringREQUIRED
Path, the Unique ID on Payfast that represents the subscription.
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
amount
integerREQUIRED
Body, the amount which the buyer must pay, in cents (ZAR), no decimals.
item_name
string, 100 charREQUIRED
Body, the name of the item being charged for.
item_description
string, 255 charOPTIONAL
Body, the description of the item being charged for.
itn
booleanOPTIONAL
Body, specify whether an ITN must be sent for the tokenization payment (true by default).
m_payment_id
string, 100 charOPTIONAL
Body, unique payment ID on the merchant’s system.
cc_cvv
numericOPTIONAL
Body, the credit card cvv number.
setup
string, JSON encodedOPTIONAL
Body, Allows the setup of additional attributes like Split Payments, click the link for more details on the available Split Payment parameters
POST /subscriptions/:token/adhoc
https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/adhoc 
cURL Example
curl -v -X POST -H “merchant-id: 10000100” -H “version: v1” -H “timestamp=2016-04-01T12:00:01” -H “signature=840654b40a8b312e54650e1613696b44” https://api.payfast.co.za/subscriptions/dc0521d3-55fe-269b-fa00-b647310d760f/adhoc 
Successful adhoc response:
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
true,
"message":
"Transaction was successful(00)",
"pf_payment_id":
"1324567"
}
}
Unsuccessful adhoc response:
RESPONSE
{
"code":
400,
"status":
"failed",
"data":
{
"response":
4,
"message":
"The subscription is not in a valid state."
}
}
Transaction history

The transaction history API gives Merchants the ability to interact with their Payfast account.

URLs to interact with take the following form:
https://api.payfast.co.za/transactions/​history/[timeframe]

Endpoints
GET /transactions/history?from=:date&to=:date
GET /transactions/history/daily?date=:date
GET /transactions/history/weekly?date=:date
GET /transactions/history/monthly?date=:date 
Transaction history for specific dates

Obtain the transaction history for a given period.
The response is a comma-separated values (CSV) of required transactions.

Parameters
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
from
YYYY-MM-DDOPTIONAL
Query parameter, start date for the time period. Defaults to current month.
to
YYYY-MM-DDOPTIONAL
Query parameter, end date for the time period. Defaults to current date.
limit
integerOPTIONAL
Query parameter, limit the number of records returned (default is 1000).
offset
integerOPTIONAL
Query parameter, the number of records to skip.
GET /transactions/history?from=:date&to=:date
https://api.payfast.co.za/transactions/history?from=2017-01-01&to=2017-02-01 
RESPONSE
{
"response":
"Date,Type,Sign,Party,Name,Description,Currency,"Funding Type",Gross,Fee,Net,Balance,"M Payment ID","PF Payment ID","custom str1","custom int1","custom str2","custom int2","custom str3","custom str4","custom str5","custom int3","custom int4","custom int5" "2020-02-27 13:29:55",FUNDS_RECEIVED,CREDIT,"Test User 01",test,,ZAR,CC,500.00,-24.73,475.27,"22,574.02",,994209,,,,,,,,,, "2020-02-27 13:30:13",FUNDS_RECEIVED,CREDIT,"Test User 01",test,,ZAR,CC,100.00,-6.79,93.21,"22,667.23",,994210,,,,,,,,,, "2020-03-02 14:31:30",FUNDS_RECEIVED,CREDIT,"Test User 01","item name",,ZAR,CC,121.00,-7.73,113.27,"22,780.50",pay_now_11611660,995893,,,,,,,,,, "2020-04-14 11:15:20",FUNDS_RECEIVED,CREDIT,"Test User 01","item name",,ZAR,CC,50.00,-4.54,45.46,"22,825.96",pay_now_11611660,1019891,,,,,,,,,,"
}
Transaction history for a set period

Obtain the transaction history for a given daily, weekly, monthly period.
The response is a comma-separated values (CSV) of the required transactions.

Parameters
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringOPTIONAL
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
date
YYYY-MM-DD or YYYY-DDOPTIONAL
Query parameter, start date of the time period.
"daily" - Format: YYYY-MM-DD, defaults to the current date.
"weekly" - Format: YYYY-MM-DD, defaults to the current week.
"monthly" - Format: YYYY-MM, defaults to the current month.
limit
integerOPTIONAL
Query parameter, limit the number of records returned (default is 1000).
offset
integerOPTIONAL
Query parameter, the number of records to skip.
GET /transactions/history/:timeframe?:date
https://api.payfast.co.za/transactions/history/daily?date=2020-01-01
https://api.payfast.co.za/transactions/history/weekly?date=2020-01-01
https://api.payfast.co.za/transactions/history/monthly?date=2020-01 
RESPONSE
{
"response":
"Date,Type,Sign,Party,Name,Description,Currency,"Funding Type",Gross,Fee,Net,Balance,"M Payment ID","PF Payment ID","custom str1","custom int1","custom str2","custom int2","custom str3","custom str4","custom str5","custom int3","custom int4","custom int5" "2020-02-27 13:29:55",FUNDS_RECEIVED,CREDIT,"Test User 01",test,,ZAR,CC,500.00,-24.73,475.27,"22,574.02",,994209,,,,,,,,,, "2020-02-27 13:30:13",FUNDS_RECEIVED,CREDIT,"Test User 01",test,,ZAR,CC,100.00,-6.79,93.21,"22,667.23",,994210,,,,,,,,,, "2020-03-02 14:31:30",FUNDS_RECEIVED,CREDIT,"Test User 01","item name",,ZAR,CC,121.00,-7.73,113.27,"22,780.50",pay_now_11611660,995893,,,,,,,,,, "2020-04-14 11:15:20",FUNDS_RECEIVED,CREDIT,"Test User 01","item name",,ZAR,CC,50.00,-4.54,45.46,"22,825.96",pay_now_11611660,1019891,,,,,,,,,,"
}
Credit card transaction query

The credit card transaction query API gives Merchants the ability to query credit card transactions.

URLs to interact with take the following form:
https://api.payfast.co.za/subscriptions/​[id]/[action]?testing=true

Sandbox:
https://api.payfast.co.za/process/​query/[Transaction Token / PayFast Payment ID]?testing=true

Endpoints
GET /process/query/:id 
Query a credit card transaction

Query a credit card transaction.

Parameters
id
stringREQUIRED
Path, the Payment or Subscription ID
pf_payment_id: The Payfast Payment ID (REQUIRED IF NOT USING token)
token: Unique ID on Payfast that represents the subscription (REQUIRED FOR SUBSCRIPTIONS)

merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
GET /process/query/:id
https://api.payfast.co.za/process/query/01d2e4c7-28c8-3a86-151f-eab5357da649
https://api.payfast.co.za/process/query/69 
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
{
"pf_payment_id":
69,
"m_payment_id":
232345,
"status":
"COMPLETE",
"amount":
3600,
"cc_status":
"00",
"cc_message":
"Approved or completed successfully (00)"
},
"message":
"Success"
}
}
Refunds

The Refunds API provides Merchants with the ability to process refunds to their buyers.

URLs to interact with take the following form:
https://api.payfast.co.za/refunds/[ pf_payment_id ]

Endpoints
GET /refunds/query/:id
GET /refunds/:id
POST /refunds/:id 
Query a refund

Get all the information you require in order to create a refund.

It is highly recommended that you run this query before performing a refund in order to ensure you have all the necessary information to perform a successful refund.
Parameters
id
stringREQUIRED
Path, The pf_payment_id (Unique transaction ID on Payfast)
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
GET /refunds/query/:id
https://api.payfast.co.za/refunds/query/dc0521d3-55fe-269b-fa00-b647310d760f 
RESPONSE
{
"token":
"a3b3ae55-ab8b-b388-df23-4e6882b86ce0",
"funding_type":
"Debit Card",
"amount_original":
1000,
"amount_available_for_refund":
500,
"status":
"REFUNDABLE",
"errors":
[
],
"refund_full":
{
"method":
"NOT_AVAILABLE"
},
"refund_partial":
{
"method":
"BANK_PAYOUT",
"bank_account_holder":
"",
"bank_name":
"",
"bank_branch_code":
"",
"bank_account_number":
"",
"bank_account_type":
""
},
"bank_names":
[
{
"bank_name":
"ABSA",
"label":
"Absa"
},
{
"bank_name":
"STANDARD",
"label":
"Standard Bank"
},
{
"bank_name":
"FNB",
"label":
"FNB"
},
{
"etc":
"..."
}
]
}
Response Schema
token
stringREQUIRED
The payment token
funding_type
stringREQUIRED
The payment method used in the original transaction
amount_original
integerREQUIRED
The original purchase amount
amount_available_for_refund
integerREQUIRED
The remaining amount if partial refunds have already been performed on the instruction.
status
stringREQUIRED
The refund status, one of: REFUNDABLE, COMPLETED, NOT_AVAILABLE
errors
array stringOPTIONAL
If status is NOT_AVAILABLE the errors array will contain a message to display to the end user
refund_full
objectREQUIRED
An object containing the parameters required for creating the full refund.
method: one of: PAYMENT_SOURCE, BANK_PAYOUT, NOT_AVAILABLE
refund_partial
objectREQUIRED
An object containing the parameters required for creating the partial refund.
method: one of: PAYMENT_SOURCE, BANK_PAYOUT, NOT_AVAILABLE
bank_names
arrayREQUIRED
When a bank refund is possible a list of available banks will be provided, this will allow you populate the bank_name accurately when processing a refund via a bank payout.
Create a refund

Create a new refund.

Before creating a new refund, make sure to call the query refund endpoint, this will provide you with all the necessary information for creating a refund.
This information includes amounts available for refund, if a refund is possible, which payment method can be used for the refund and any additional parameters that are required for that refund payment method.
Parameters
id
stringREQUIRED
Path, The pf_payment_id (Unique transaction ID on Payfast)
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
amount
integerREQUIRED
Body, the amount to refund in cents (ZAR).
Both partial and full amounts are supported.
reason
string, 3-255 charREQUIRED
Body, the reason for the refund.
notify_merchant
boolean, 1 charOPTIONAL
Body, Whether or not to notify the merchant of the refund. 1 = true, 0 = false.
Default is 0.
notify_buyer
boolean, 1 charREQUIRED
Body, Whether or not to notify the buyer of the refund. 1 = true, 0 = false.
acc_holder | bank_account_holder
string, 255 charREQUIRED - BANK_PAYOUT ONLY
Body, the name of the account holder.
bank_name
string, 255 charREQUIRED - BANK_PAYOUT ONLY
Body, the name of the bank. The list is available via query refund endpoint
bank_branch_code
integer, max 6 charREQUIRED - BANK_PAYOUT ONLY
Body, the bank branch code
bank_account_number
integer, max 12 charREQUIRED - BANK_PAYOUT ONLY
Body, the bank account number
acc_type | bank_account_type
string, 5-10 charREQUIRED - BANK_PAYOUT ONLY
Body, the account type:
- current
- savings
POST /refunds/:id
https://api.payfast.co.za/refunds/dc0521d3-55fe-269b-fa00-b647310d760f 
EFT request example
{
    "amount": "1000",
    "notify_buyer": true,
    "notify_merchant": false,
    "reason": "Product out of stock",
    "bank_account_holder": "Mr Smith",
    "bank_name": "FNB",
    "bank_branch_code": "111111",
    "bank_account_number": "100000000000",
    "bank_account_type": "current",
} 
CREDIT CARD request example
{
    "amount": "1000",
    "notify_buyer": true,
    "notify_merchant": false,
    "reason": "Product out of stock"
} 
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
true,
"message":
"Success"
}
}
Retrieve a refund

Obtain the available balance and transactions related to a refund.

Parameters
id
stringREQUIRED
Path, The pf_payment_id (Unique transaction ID on Payfast)
merchant-id
integer, 8 charREQUIRED
Header, the Merchant ID as given by the Payfast system.
version
stringREQUIRED
Header, the Payfast API version (i.e. v1).
timestamp
ISO-8601 date and timeREQUIRED
Header, the current timestamp (YYYY-MM-DDTHH:MM:SS[+HH:MM]).
signature
stringREQUIRED
Header, MD5 hash of the alphabetised submitted header and body variables, as well as the passphrase. Characters must be in lower case.
GET /refunds/:id
https://api.payfast.co.za/refunds/dc0521d3-55fe-269b-fa00-b647310d760f 
RESPONSE
{
"code":
200,
"status":
"success",
"data":
{
"response":
{
"available_balance":
6800,
"transactions":
[
{
"amount":
9800,
"date":
"2020-05-14 12:11:05",
"type":
"Funds Received"
},
{
"amount":
"-1000",
"date":
"2020-05-14 14:59:59",
"type":
"Funds Received (Refund)"
},
{
"amount":
"-2000",
"date":
"2020-05-15 09:59:59",
"type":
"Funds Received (Refund)"
}
]
},
"message":
"success"
}
}
Payfast Status API

The following documentation is provided to let users of the Payfast status page programmatically access various elements on the page.

External docs: Payfast Status API

Option 1: Endpoints:
Endpoints are displayed with examples using cURL

Option 2: Javascript library:
A wrapper for the page status api, exposing convenient actions useful for embedding your status anywhere.
Add the CDN script below to use the JS widget.

Javascript CDN
<script type="text/javascript" src="https://cdn.statuspage.io/se-v2.js"></script> 
1. Summary
Get a summary of the status page, including a status indicator, component statuses, unresolved incidents, and any upcoming or in-progress scheduled maintenances.
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/summary.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-01T00:11:02.918+02:00"
},
"components":
[
{
"id":
"cm4bv615g2dk",
"name":
"ABSA",
"status":
"operational",
"created_at":
"2019-07-11T16:03:08.426+02:00",
"updated_at":
"2021-12-21T15:54:21.872+02:00",
"position":
1,
"description":
"Our Instant EFT payment service - ABSA",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"phplv458l8tp",
"name":
"Payments :: Credit & Cheque Cards",
"status":
"operational",
"created_at":
"2018-01-31T22:32:21.831+02:00",
"updated_at":
"2021-12-21T15:54:21.884+02:00",
"position":
1,
"description":
"Our Credit & Cheque Card payment service",
"showcase":
false,
"start_date":
null,
"group_id":
"by3ldtj5f0m0",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"by3ldtj5f0m0",
"name":
"Credit & Cheque Cards",
"status":
"operational",
"created_at":
"2021-12-13T12:16:53.241+02:00",
"updated_at":
"2021-12-13T12:17:22.378+02:00",
"position":
1,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
true,
"only_show_if_degraded":
false,
"components":
[
"phplv458l8tp",
"x3myv0b0jhb1"
]
},
{
"id":
"qqqz7kxvykqz",
"name":
"African Bank",
"status":
"operational",
"created_at":
"2021-03-17T10:47:18.901+02:00",
"updated_at":
"2021-12-21T15:54:21.909+02:00",
"position":
2,
"description":
"Our Instant EFT payment service - African Bank",
"showcase":
false,
"start_date":
"2021-01-01",
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"x3myv0b0jhb1",
"name":
"Recurring :: Credit & Cheque Cards",
"status":
"operational",
"created_at":
"2021-12-13T12:18:13.892+02:00",
"updated_at":
"2021-12-21T15:54:21.897+02:00",
"position":
2,
"description":
"Payfast Recurring Credit & Cheque Card payment service",
"showcase":
false,
"start_date":
"2021-12-13",
"group_id":
"by3ldtj5f0m0",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"y6jvvd513jp1",
"name":
"Payments :: Instant EFT",
"status":
"operational",
"created_at":
"2019-07-11T16:03:08.418+02:00",
"updated_at":
"2021-12-13T12:17:22.386+02:00",
"position":
2,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
true,
"only_show_if_degraded":
false,
"components":
[
"cm4bv615g2dk",
"qqqz7kxvykqz",
"4626m6rshhtm",
"zhqjygkbb5hl",
"s1zkl1llgp4l",
"f6595346cwct",
"qkfzxf04q6pz",
"0xvqbq9qnpm4",
"kkws0khtd1dv"
]
},
{
"id":
"4626m6rshhtm",
"name":
"Bidvest",
"status":
"operational",
"created_at":
"2021-03-17T10:48:17.803+02:00",
"updated_at":
"2021-12-21T15:54:21.920+02:00",
"position":
3,
"description":
"Our Instant EFT payment service - Bidvest Bank",
"showcase":
false,
"start_date":
"2021-03-15",
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"324hr62fh5cq",
"name":
"Payments :: Mobicred",
"status":
"operational",
"created_at":
"2018-01-31T22:36:52.290+02:00",
"updated_at":
"2021-12-21T15:54:21.930+02:00",
"position":
3,
"description":
"Our mobicred payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zhqjygkbb5hl",
"name":
"Capitec",
"status":
"operational",
"created_at":
"2019-07-11T16:05:00.227+02:00",
"updated_at":
"2021-12-21T15:54:21.952+02:00",
"position":
4,
"description":
"Our Instant EFT payment service - Capitec",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zf5drf301bff",
"name":
"Payments :: Debit Cards",
"status":
"operational",
"created_at":
"2018-01-31T22:37:04.171+02:00",
"updated_at":
"2021-12-21T15:54:21.940+02:00",
"position":
4,
"description":
"Our Debit Card payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"cwrr763rwt79",
"name":
"Payments :: Masterpass",
"status":
"operational",
"created_at":
"2018-01-31T22:37:15.779+02:00",
"updated_at":
"2021-12-21T15:54:21.975+02:00",
"position":
5,
"description":
"Our Masterpass payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"s1zkl1llgp4l",
"name":
"FNB",
"status":
"operational",
"created_at":
"2018-01-31T22:32:21.853+02:00",
"updated_at":
"2021-12-21T15:54:21.965+02:00",
"position":
5,
"description":
"Our Instant EFT payment service - FNB",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"f6595346cwct",
"name":
"Investec",
"status":
"operational",
"created_at":
"2019-07-11T16:05:51.297+02:00",
"updated_at":
"2021-12-21T15:54:22.007+02:00",
"position":
6,
"description":
"Our Instant EFT payment service - Investec",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"k9c6zxbfgs7y",
"name":
"Payments :: Zapper",
"status":
"operational",
"created_at":
"2021-03-17T10:50:24.352+02:00",
"updated_at":
"2021-12-21T15:54:21.985+02:00",
"position":
6,
"description":
"Our Zapper payment service",
"showcase":
false,
"start_date":
"2021-03-17",
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"fnn8c8fh810d",
"name":
"Payments :: SCode",
"status":
"operational",
"created_at":
"2018-03-01T07:18:45.914+02:00",
"updated_at":
"2021-12-21T15:54:22.030+02:00",
"position":
7,
"description":
"Our SCode payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"qkfzxf04q6pz",
"name":
"Nedbank",
"status":
"operational",
"created_at":
"2019-07-11T16:06:18.481+02:00",
"updated_at":
"2021-12-21T15:54:22.019+02:00",
"position":
7,
"description":
"Our Instant EFT payment service - Nedbank",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"9n04mkpgqr73",
"name":
"Operations :: Dashboard",
"status":
"operational",
"created_at":
"2019-09-27T13:10:38.005+02:00",
"updated_at":
"2021-12-21T15:54:22.040+02:00",
"position":
8,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"0xvqbq9qnpm4",
"name":
"Standard Bank",
"status":
"operational",
"created_at":
"2019-07-11T16:06:56.004+02:00",
"updated_at":
"2021-12-21T15:54:22.053+02:00",
"position":
8,
"description":
"Our Instant EFT payment service - Standard Bank",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"j6f3184y8pkc",
"name":
"Operations :: Payouts",
"status":
"operational",
"created_at":
"2019-09-27T13:12:02.796+02:00",
"updated_at":
"2021-12-21T15:54:22.063+02:00",
"position":
9,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"kkws0khtd1dv",
"name":
"Tyme Bank",
"status":
"operational",
"created_at":
"2021-03-17T10:47:51.988+02:00",
"updated_at":
"2021-12-21T15:54:22.075+02:00",
"position":
9,
"description":
"Our Instant EFT payment service - Tyme Bank",
"showcase":
false,
"start_date":
"2021-01-01",
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"2vn801bgblkv",
"name":
"Integrations & APIs",
"status":
"operational",
"created_at":
"2019-09-27T13:13:06.876+02:00",
"updated_at":
"2021-12-21T15:54:22.085+02:00",
"position":
10,
"description":
"Related to any integrations into our platform (Shopify, WooCommerce etc.) as well as issues relating to specific APIs (Mobile, Recurring etc.)",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"mmr3kvxr5bzr",
"name":
"Website :: Main Site",
"status":
"operational",
"created_at":
"2018-01-31T22:52:33.023+02:00",
"updated_at":
"2021-12-21T15:54:22.094+02:00",
"position":
11,
"description":
"Our main website",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zq593gggr2nt",
"name":
"Website :: Developer Site",
"status":
"operational",
"created_at":
"2018-01-31T22:53:03.771+02:00",
"updated_at":
"2021-12-21T15:54:22.104+02:00",
"position":
12,
"description":
"Our developer documentation website",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zhmjwqtxvvfj",
"name":
"Helpdesk",
"status":
"operational",
"created_at":
"2018-01-31T22:53:15.441+02:00",
"updated_at":
"2021-12-21T15:54:22.114+02:00",
"position":
13,
"description":
"Our support website",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"d075p3k7tgdj",
"name":
"Payments :: MoreTyme",
"status":
"operational",
"created_at":
"2021-09-23T13:44:35.440+02:00",
"updated_at":
"2021-12-21T15:54:22.127+02:00",
"position":
14,
"description":
"MoreTyme BNPL Payment methods",
"showcase":
false,
"start_date":
"2021-09-23",
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
}
],
"incidents":
[
],
"scheduled_maintenances":
[
],
"status":
{
"indicator":
"none",
"description":
"All Systems Operational"
}
}
2. Status
Get the status rollup for the whole page. This endpoint includes an indicator - one of none, minor, major, or critical, as well as a human description of the blended component status. Examples of the blended status include "All Systems Operational", "Partial System Outage", and "Major Service Outage".
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/status.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-20T16:05:42.931+02:00"
},
"status":
{
"indicator":
"none",
"description":
"All Systems Operational"
}
}
3. Components
Get the components for the page. Each component is listed along with its status - one of operational, degraded_performance, partial_outage, or major_outage.
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/components.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-20T16:05:42.931+02:00"
},
"components":
[
{
"id":
"cm4bv615g2dk",
"name":
"ABSA",
"status":
"operational",
"created_at":
"2019-07-11T16:03:08.426+02:00",
"updated_at":
"2021-12-21T15:54:21.872+02:00",
"position":
1,
"description":
"Our Instant EFT payment service - ABSA",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"phplv458l8tp",
"name":
"Payments :: Credit & Cheque Cards",
"status":
"operational",
"created_at":
"2018-01-31T22:32:21.831+02:00",
"updated_at":
"2022-01-20T16:05:42.880+02:00",
"position":
1,
"description":
"Our Credit & Cheque Card payment service",
"showcase":
false,
"start_date":
null,
"group_id":
"by3ldtj5f0m0",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"by3ldtj5f0m0",
"name":
"Credit & Cheque Cards",
"status":
"operational",
"created_at":
"2021-12-13T12:16:53.241+02:00",
"updated_at":
"2021-12-13T12:17:22.378+02:00",
"position":
1,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
true,
"only_show_if_degraded":
false,
"components":
[
"phplv458l8tp",
"x3myv0b0jhb1"
]
},
{
"id":
"qqqz7kxvykqz",
"name":
"African Bank",
"status":
"operational",
"created_at":
"2021-03-17T10:47:18.901+02:00",
"updated_at":
"2021-12-21T15:54:21.909+02:00",
"position":
2,
"description":
"Our Instant EFT payment service - African Bank",
"showcase":
false,
"start_date":
"2021-01-01",
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"x3myv0b0jhb1",
"name":
"Recurring :: Credit & Cheque Cards",
"status":
"operational",
"created_at":
"2021-12-13T12:18:13.892+02:00",
"updated_at":
"2021-12-21T15:54:21.897+02:00",
"position":
2,
"description":
"Payfast Recurring Credit & Cheque Card payment service",
"showcase":
false,
"start_date":
"2021-12-13",
"group_id":
"by3ldtj5f0m0",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"y6jvvd513jp1",
"name":
"Payments :: Instant EFT",
"status":
"operational",
"created_at":
"2019-07-11T16:03:08.418+02:00",
"updated_at":
"2021-12-13T12:17:22.386+02:00",
"position":
2,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
true,
"only_show_if_degraded":
false,
"components":
[
"cm4bv615g2dk",
"qqqz7kxvykqz",
"4626m6rshhtm",
"zhqjygkbb5hl",
"s1zkl1llgp4l",
"f6595346cwct",
"qkfzxf04q6pz",
"0xvqbq9qnpm4",
"kkws0khtd1dv"
]
},
{
"id":
"4626m6rshhtm",
"name":
"Bidvest",
"status":
"operational",
"created_at":
"2021-03-17T10:48:17.803+02:00",
"updated_at":
"2021-12-21T15:54:21.920+02:00",
"position":
3,
"description":
"Our Instant EFT payment service - Bidvest Bank",
"showcase":
false,
"start_date":
"2021-03-15",
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"324hr62fh5cq",
"name":
"Payments :: Mobicred",
"status":
"operational",
"created_at":
"2018-01-31T22:36:52.290+02:00",
"updated_at":
"2021-12-21T15:54:21.930+02:00",
"position":
3,
"description":
"Our mobicred payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zhqjygkbb5hl",
"name":
"Capitec",
"status":
"operational",
"created_at":
"2019-07-11T16:05:00.227+02:00",
"updated_at":
"2021-12-21T15:54:21.952+02:00",
"position":
4,
"description":
"Our Instant EFT payment service - Capitec",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zf5drf301bff",
"name":
"Payments :: Debit Cards",
"status":
"operational",
"created_at":
"2018-01-31T22:37:04.171+02:00",
"updated_at":
"2021-12-21T15:54:21.940+02:00",
"position":
4,
"description":
"Our Debit Card payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"cwrr763rwt79",
"name":
"Payments :: Masterpass",
"status":
"operational",
"created_at":
"2018-01-31T22:37:15.779+02:00",
"updated_at":
"2021-12-21T15:54:21.975+02:00",
"position":
5,
"description":
"Our Masterpass payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"s1zkl1llgp4l",
"name":
"FNB",
"status":
"operational",
"created_at":
"2018-01-31T22:32:21.853+02:00",
"updated_at":
"2021-12-21T15:54:21.965+02:00",
"position":
5,
"description":
"Our Instant EFT payment service - FNB",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"f6595346cwct",
"name":
"Investec",
"status":
"operational",
"created_at":
"2019-07-11T16:05:51.297+02:00",
"updated_at":
"2021-12-21T15:54:22.007+02:00",
"position":
6,
"description":
"Our Instant EFT payment service - Investec",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"k9c6zxbfgs7y",
"name":
"Payments :: Zapper",
"status":
"operational",
"created_at":
"2021-03-17T10:50:24.352+02:00",
"updated_at":
"2021-12-21T15:54:21.985+02:00",
"position":
6,
"description":
"Our Zapper payment service",
"showcase":
false,
"start_date":
"2021-03-17",
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"fnn8c8fh810d",
"name":
"Payments :: SCode",
"status":
"operational",
"created_at":
"2018-03-01T07:18:45.914+02:00",
"updated_at":
"2021-12-21T15:54:22.030+02:00",
"position":
7,
"description":
"Our SCode payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"qkfzxf04q6pz",
"name":
"Nedbank",
"status":
"operational",
"created_at":
"2019-07-11T16:06:18.481+02:00",
"updated_at":
"2021-12-21T15:54:22.019+02:00",
"position":
7,
"description":
"Our Instant EFT payment service - Nedbank",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"9n04mkpgqr73",
"name":
"Operations :: Dashboard",
"status":
"operational",
"created_at":
"2019-09-27T13:10:38.005+02:00",
"updated_at":
"2021-12-21T15:54:22.040+02:00",
"position":
8,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"0xvqbq9qnpm4",
"name":
"Standard Bank",
"status":
"operational",
"created_at":
"2019-07-11T16:06:56.004+02:00",
"updated_at":
"2021-12-21T15:54:22.053+02:00",
"position":
8,
"description":
"Our Instant EFT payment service - Standard Bank",
"showcase":
false,
"start_date":
null,
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"j6f3184y8pkc",
"name":
"Operations :: Payouts",
"status":
"operational",
"created_at":
"2019-09-27T13:12:02.796+02:00",
"updated_at":
"2021-12-21T15:54:22.063+02:00",
"position":
9,
"description":
null,
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"kkws0khtd1dv",
"name":
"Tyme Bank",
"status":
"operational",
"created_at":
"2021-03-17T10:47:51.988+02:00",
"updated_at":
"2021-12-21T15:54:22.075+02:00",
"position":
9,
"description":
"Our Instant EFT payment service - Tyme Bank",
"showcase":
false,
"start_date":
"2021-01-01",
"group_id":
"y6jvvd513jp1",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"2vn801bgblkv",
"name":
"Integrations & APIs",
"status":
"operational",
"created_at":
"2019-09-27T13:13:06.876+02:00",
"updated_at":
"2021-12-21T15:54:22.085+02:00",
"position":
10,
"description":
"Related to any integrations into our platform (Shopify, WooCommerce etc.) as well as issues relating to specific APIs (Mobile, Recurring etc.)",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"mmr3kvxr5bzr",
"name":
"Website :: Main Site",
"status":
"operational",
"created_at":
"2018-01-31T22:52:33.023+02:00",
"updated_at":
"2021-12-21T15:54:22.094+02:00",
"position":
11,
"description":
"Our main website",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zq593gggr2nt",
"name":
"Website :: Developer Site",
"status":
"operational",
"created_at":
"2018-01-31T22:53:03.771+02:00",
"updated_at":
"2021-12-21T15:54:22.104+02:00",
"position":
12,
"description":
"Our developer documentation website",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"zhmjwqtxvvfj",
"name":
"Helpdesk",
"status":
"operational",
"created_at":
"2018-01-31T22:53:15.441+02:00",
"updated_at":
"2021-12-21T15:54:22.114+02:00",
"position":
13,
"description":
"Our support website",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
},
{
"id":
"d075p3k7tgdj",
"name":
"Payments :: MoreTyme",
"status":
"operational",
"created_at":
"2021-09-23T13:44:35.440+02:00",
"updated_at":
"2021-12-21T15:54:22.127+02:00",
"position":
14,
"description":
"MoreTyme BNPL Payment methods",
"showcase":
false,
"start_date":
"2021-09-23",
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
}
]
}
4. Incidents
Incidents are the cornerstone of any status page, being composed of many incident updates.
Each incident usually goes through a progression of statuses listed below, with an impact calculated from a blend of component statuses (or an optional override).



Status: Investigating, Identified, Monitoring, Resolved, or Postmortem

Impact: None (black), Minor (yellow), Major (orange), or Critical (red)

4.1 Unresolved Incidents
Get a list of any unresolved incidents. This endpoint will only return incidents in the Investigating, Identified, or Monitoring state.
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/incidents/unresolved.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-20T16:05:42.931+02:00"
},
"incidents":
[
]
}
4.2 All Incidents
Get a list of the 50 most recent incidents. This includes all unresolved incidents as described above, as well as those in the Resolved and Postmortem state.
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/incidents.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-20T16:05:42.931+02:00"
},
"incidents":
[
{
"id":
"l0wfwnhd33vx",
"name":
"3DSecure outage is causing some credit card transactions to fail",
"status":
"resolved",
"created_at":
"2022-01-20T14:27:26.256+02:00",
"updated_at":
"2022-01-20T16:05:42.928+02:00",
"monitoring_at":
null,
"resolved_at":
"2022-01-20T16:05:42.914+02:00",
"impact":
"major",
"shortlink":
"https://stspg.io/fk57rhptdwgr",
"started_at":
"2022-01-20T14:27:26.249+02:00",
"page_id":
"hbt40cyvzkpg",
"incident_updates":
[
{
"id":
"hxfsx5gyz48n",
"status":
"resolved",
"body":
"This incident has been resolved.",
"incident_id":
"l0wfwnhd33vx",
"created_at":
"2022-01-20T16:05:42.914+02:00",
"updated_at":
"2022-01-20T16:05:42.914+02:00",
"display_at":
"2022-01-20T16:05:42.914+02:00",
"affected_components":
[
{
"code":
"phplv458l8tp",
"name":
"Credit & Cheque Cards - Payments :: Credit & Cheque Cards",
"old_status":
"partial_outage",
"new_status":
"operational"
}
],
"deliver_notifications":
true,
"custom_tweet":
null,
"tweet_id":
null
},
{
"id":
"ffqdtmmpp4sv",
"status":
"identified",
"body":
"Some credit card transactions are being declined due to failing 3Dsecure upstream. All other payment methods remain available and processing successfully.",
"incident_id":
"l0wfwnhd33vx",
"created_at":
"2022-01-20T14:27:26.370+02:00",
"updated_at":
"2022-01-20T14:27:26.370+02:00",
"display_at":
"2022-01-20T14:27:26.370+02:00",
"affected_components":
[
{
"code":
"phplv458l8tp",
"name":
"Credit & Cheque Cards - Payments :: Credit & Cheque Cards",
"old_status":
"operational",
"new_status":
"partial_outage"
}
],
"deliver_notifications":
true,
"custom_tweet":
null,
"tweet_id":
null
}
],
"components":
[
{
"id":
"phplv458l8tp",
"name":
"Payments :: Credit & Cheque Cards",
"status":
"operational",
"created_at":
"2018-01-31T22:32:21.831+02:00",
"updated_at":
"2022-01-20T16:05:42.880+02:00",
"position":
1,
"description":
"Our Credit & Cheque Card payment service",
"showcase":
false,
"start_date":
null,
"group_id":
"by3ldtj5f0m0",
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
}
]
}
],
"...":
"↓"
}
5. Scheduled Maintenance
Scheduled maintenances are planned outages, upgrades, or general notices that you're working on infrastructure and disruptions may occurr.
A close sibling of Incidents, each usually goes through a progression of statuses listed below, with an impact calculated from a blend of component statuses (or an optional override).



Status: cheduled, In Progress, Verifying, or Completed

Impact: None (black), Minor (yellow), Major (orange), or Critical (red)

5.1 Upcoming Scheduled Maintenance
Get a list of any upcoming maintenances. This endpoint will only return scheduled maintenances still in the Scheduled state.
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/scheduled-maintenances/upcoming.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-20T16:05:42.931+02:00"
},
"scheduled_maintenances":
[
]
}
5.2 Active Scheduled Maintenance
Get a list of any active maintenances. This endpoint will only return scheduled maintenances in the In Progress or Verifying state.
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/scheduled-maintenances/active.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-20T16:05:42.931+02:00"
},
"scheduled_maintenances":
[
]
}
5.3 All Scheduled Maintenance
Get a list of the 50 most recent scheduled maintenances. This includes scheduled maintenances as described in the above two endpoints, as well as those in the Completed state.
Using Endpoint ( cURL )
Using Widget ( JS )
Endpoint
GET https://status.payfast.io/api/v2/scheduled-maintenances.json 
ENDPOINT RESPONSE
{
"page":
{
"id":
"hbt40cyvzkpg",
"name":
"Payfast",
"url":
"https://status.payfast.io",
"time_zone":
"Africa/Johannesburg",
"updated_at":
"2022-01-20T16:05:42.931+02:00"
},
"scheduled_maintenances":
[
{
"id":
"r4y8bmszthj3",
"name":
"Masterpass maintenance",
"status":
"completed",
"created_at":
"2021-10-14T19:43:23.549+02:00",
"updated_at":
"2021-10-22T05:00:30.315+02:00",
"monitoring_at":
null,
"resolved_at":
"2021-10-22T05:00:30.300+02:00",
"impact":
"maintenance",
"shortlink":
"https://stspg.io/s7vcx0wjggkd",
"started_at":
"2021-10-14T19:43:23.545+02:00",
"page_id":
"hbt40cyvzkpg",
"incident_updates":
[
{
"id":
"r9r4kvqwjzsy",
"status":
"completed",
"body":
"The scheduled maintenance has been completed.",
"incident_id":
"r4y8bmszthj3",
"created_at":
"2021-10-22T05:00:30.300+02:00",
"updated_at":
"2021-10-22T05:00:30.300+02:00",
"display_at":
"2021-10-22T05:00:30.300+02:00",
"affected_components":
[
{
"code":
"cwrr763rwt79",
"name":
"Payments :: Masterpass",
"old_status":
"under_maintenance",
"new_status":
"operational"
}
],
"deliver_notifications":
true,
"custom_tweet":
null,
"tweet_id":
null
},
{
"id":
"gnljhx6cfhm7",
"status":
"in_progress",
"body":
"Scheduled maintenance is currently in progress. We will provide updates as necessary.",
"incident_id":
"r4y8bmszthj3",
"created_at":
"2021-10-21T22:02:33.714+02:00",
"updated_at":
"2021-10-21T22:02:33.714+02:00",
"display_at":
"2021-10-21T22:02:33.714+02:00",
"affected_components":
[
{
"code":
"cwrr763rwt79",
"name":
"Payments :: Masterpass",
"old_status":
"operational",
"new_status":
"under_maintenance"
}
],
"deliver_notifications":
true,
"custom_tweet":
null,
"tweet_id":
null
},
{
"id":
"5xzfxr5k6ryt",
"status":
"scheduled",
"body":
"Maintenance will begin as scheduled in 60 minutes.",
"incident_id":
"r4y8bmszthj3",
"created_at":
"2021-10-21T21:00:31.881+02:00",
"updated_at":
"2021-10-21T21:00:31.881+02:00",
"display_at":
"2021-10-21T21:00:31.881+02:00",
"affected_components":
null,
"deliver_notifications":
true,
"custom_tweet":
null,
"tweet_id":
null
},
{
"id":
"dr0msl9j94sq",
"status":
"scheduled",
"body":
"Masterpass partners upstream will be conducting maintenance.",
"incident_id":
"r4y8bmszthj3",
"created_at":
"2021-10-14T19:43:23.591+02:00",
"updated_at":
"2021-10-14T19:43:23.591+02:00",
"display_at":
"2021-10-14T19:43:23.591+02:00",
"affected_components":
[
{
"code":
"cwrr763rwt79",
"name":
"Payments :: Masterpass",
"old_status":
"operational",
"new_status":
"operational"
}
],
"deliver_notifications":
true,
"custom_tweet":
null,
"tweet_id":
null
}
],
"components":
[
{
"id":
"cwrr763rwt79",
"name":
"Payments :: Masterpass",
"status":
"operational",
"created_at":
"2018-01-31T22:37:15.779+02:00",
"updated_at":
"2021-12-21T15:54:21.975+02:00",
"position":
5,
"description":
"Our Masterpass payment service",
"showcase":
false,
"start_date":
null,
"group_id":
null,
"page_id":
"hbt40cyvzkpg",
"group":
false,
"only_show_if_degraded":
false
}
],
"scheduled_for":
"2021-10-21T22:00:00.000+02:00",
"scheduled_until":
"2021-10-22T05:00:00.000+02:00"
},
{
"etc":
"..."
}
]
}
2026 — Payfast | All right reserved.
PCI-DSS Level 1 Service Provider Compliant
v0.1.24