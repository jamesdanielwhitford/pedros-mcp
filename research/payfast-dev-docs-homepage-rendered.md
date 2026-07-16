# Payfast Developer Documentation (rendered, full page)

Source: https://developers.payfast.co.za/

---

Docs
​
API Ref
Support
Sign Up
Home
Custom Integration
Onsite Payments
Recurring Billing
Split Payments
PCI Compliance
Testing and Tools
Widgets
Ports and IP Addresses
FAQs
Gateway Developer Documentation: If you are looking for Dev Docs related to Paygate please see here.
Documentation
Quickly integrate Payfast into your platform.
Custom Integration

Build a checkout form and receive payments
securely from our payment platform.

Simple integration
Create security signature
Pay with Payfast
Confirm payment
APIs

Server-to-server integration.

Authentication
Error handling
Recurring Billing
View all
Onsite Payments
Receive payments without redirecting customers
away from your website.
Recurring Billing

Enable subscription and tokenization payments.

Subscriptions
Tokenization
Additional methods of integrating
Pay Now Button
Generate Pay Now HTML button code.
Shopping Carts
Choose from one of our many plugins.
Custom Payment Integration

Build a checkout form and receive payments securely from our payment platform.
This process can be used for both one-time and recurring payments.

Live: https://www.payfast.co.za/eng/process
Sandbox: https://sandbox.payfast.co.za​/eng/process

Quick start: It is recommended that you create your own Sandbox account to test your integration.
Simple Form Integration
<form action="https://www.payfast.co.za/eng/process" method="post">
   <input type="hidden" name="merchant_id" value="10000100">
   <input type="hidden" name="merchant_key" value="46f0cd694581a">
   <input type="hidden" name="amount" value="100.00">
   <input type="hidden" name="item_name" value="Test Product">
   <input type="submit">
</form> 
Step 1: Create your checkout form
Create a checkout page with an HTML form, usually hidden, with a number of fields containing all the necessary information needed for Payfast to process the payment. Most shopping cart platforms will have the customer click on a ‘Confirm Order’ or ‘Pay Now’ button to submit the form and be redirected to the Payfast Payment page.
Merchant details
merchant_id
integer, 8 charREQUIRED
The Merchant ID as given by the Payfast system. Used to uniquely identify the receiving account. This can be found on the merchant’s settings page.
merchant_key
stringREQUIRED
The Merchant Key as given by the Payfast system. Used to uniquely identify the receiving account. This provides an extra level of certainty concerning the correct account as both the ID and the Key must be correct in order for the transaction to proceed. This can be found on the merchant’s settings page.
return_url
string, no char limitOPTIONAL
The URL where the user is returned to after payment has been successfully taken.
cancel_url
string, no char limitOPTIONAL
The URL where the user should be redirected should they choose to cancel their payment while on the Payfast system.
notify_url
string, no char limitOPTIONAL
The URL which is used by Payfast to post the Instant Transaction Notifications (ITNs) for this transaction.
fica_idnumber
integer, 13 charOPTIONAL
The Fica ID Number provided of the buyer must be a valid South African ID Number.
For the notify_url mentioned, a variable can be specified globally on the Merchant’s Payfast account or overridden on a per transaction basis. The value provided during a transaction overrides the global setting.
Merchant Details
<input type="hidden" name="merchant_id" value="10000100">
<input type="hidden" name="merchant_key" value="46f0cd694581a">
<input type="hidden" name="return_url" value="https://www.example.com/success">
<input type="hidden" name="cancel_url" value="https://www.example.com/cancel">
<input type="hidden" name="notify_url" value="https://www.example.com/notify">
 
Customer details
name_first
string, 100 char OPTIONAL
The customer’s first name.
name_last
string, 100 char OPTIONAL
The customer’s last name.
email_address
string, 100 char OPTIONAL
The customer’s email address.
cell_number
string, 100 char OPTIONAL
The customer’s valid cell number. If the email_address field is empty, and cell_number provided, the system will use the cell_number as the username and auto login the user, if they do not have a registered account
Customer Details
<input type="hidden" name="name_first" value="John">
<input type="hidden" name="name_last" value="Doe">
<input type="hidden" name="email_address" value="john@doe.com">
<input type="hidden" name="cell_number" value="0823456789"> 
Transaction details
m_payment_id
string, 100 char OPTIONAL
Unique payment ID on the merchant’s system.
amount
decimalREQUIRED
The amount which the payer must pay in ZAR.
item_name
string, 100 char REQUIRED
The name of the item being charged for, or in the case of multiple items the order number.
item_description
string, 255 char OPTIONAL
The description of the item being charged for, or in the case of multiple items the order description.
custom_int<1..5>
integer, 255 charOPTIONAL
A series of 5 custom integer variables (custom_int1, custom_int2…) which can be used by the merchant as pass-through variables. They will be posted back to the merchant at the completion of the transaction.
custom_str<1..5>
string, 255 char OPTIONAL
A series of 5 custom string variables (custom_str1, custom_str2…) which can be used by the merchant as pass-through variables. They will be posted back to the merchant at the completion of the transaction.
Transaction Details
<input type="hidden" name="m_payment_id" value="01AB">
<input type="hidden" name="amount" value="100.00">
<input type="hidden" name="item_name" value="Test Item">
<input type="hidden" name="item_description" value="A test product">
<input type="hidden" name="custom_int1" value="2">
<input type="hidden" name="custom_str1" value="Extra order information">
 
Transaction options
email_confirmation
boolean, 1 charOPTIONAL
Whether to send an email confirmation to the merchant of the transaction. The email confirmation is automatically sent to the payer. 1 = on, 0 = off
confirmation_address
string, 100 charOPTIONAL
The email address to send the confirmation email to. This value can be set globally on your account. Using this field will override the value set in your account for this transaction.
Transaction Options
<input type="hidden" name="email_confirmation" value="1">
<input type="hidden" name="confirmation_address" value="john@doe.com"> 
Payment methods
payment_method
string, 3 char OPTIONAL
When this field is set, only the SINGLE payment method specified can be used when the customer reaches Payfast. If this field is blank, or not included, then all available payment methods will be shown.

The values are as follows:

‘ef’ – EFT
‘cc’ – Credit card
‘dc’ – Debit card
’mp’ – Masterpass Scan to Pay
‘mc’ – Mobicred
‘sc’ – SCode
‘ss’ – SnapScan
‘zp’ – Zapper
‘mt’ – MoreTyme
‘rc’ – Store card
‘mu’ – Mukuru
‘ap’ – Apple Pay
‘sp’ – Samsung Pay
‘cp’ – Capitec Pay
‘ab’ – Absa Pay
‘gp’ – Google Pay
‘nd’ – Nedbank Direct EFT
‘pf’ – Payflex. Buy Now, Pay Later
Payment Methods
<input type="hidden" name="payment_method" value="cc"> 
Recurring Billing and Split Payment form options



(See Recurring Billing subscriptions and Split Payments for additional fields)

Step 2: Create security signature
A generated MD5 signature must be passed as an additional hidden input and this hash is then used to ensure the integrity of the data transfer.
Security Signature
<input type="hidden" name="signature" value="f103e22c0418655fb03991538c51bfd5"> 
To generate the signature:



1. Concatenation of the name value pairs of all the non-blank variables with ‘&’ used as a separator

Variable order: The pairs must be listed in the order in which they appear in the attributes description. eg. name_first=John&name_last=Doe​&email_address=…
* Do not use the API signature format, which uses alphabetical ordering!

2. Add your passphrase
The passphrase is an extra security feature, used as a ‘salt’, and is set by the Merchant in the Settings section of their Payfast Dashboard.
Add the passphrase to the end of the below string.
E.g. name_first=John&name_last=Doe​&email_address=…&passphrase=...

The resultant URL encoding must be in upper case (eg. http%3A%2F%2F), and spaces encoded as ‘+’.

3. MD5 the parameter string and pass it as a hidden input named “signature”

Troubleshooting: For troubleshooting signature mismatch issues check out our knowledge base Common causes of a failed integration / signature mismatch
Signature generation
Select library
<?php
/**
 * @param array $data
 * @param null $passPhrase
 * @return string
 */
function generateSignature($data, $passPhrase = null) {
    // Create parameter string
    $pfOutput = '';
    foreach( $data as $key => $val ) {
        if($val !== '') {
            $pfOutput .= $key .'='. urlencode( trim( $val ) ) .'&';
        }
    }
    // Remove last ampersand
    $getString = substr( $pfOutput, 0, -1 );
    if( $passPhrase !== null ) {
        $getString .= '&passphrase='. urlencode( trim( $passPhrase ) );
    }
    return md5( $getString );
} 
Step 3: Send the customer to Payfast for payment
On submission of your form, your customers will be redirected to the secure Payfast payments page.
Your form should be setup to post to either Payfast's live URL or the Sandbox for testing.
Full form implementation
Select library
<?php
// Construct variables
$cartTotal = 10.00; // This amount needs to be sourced from your application
$passphrase = 'jt7NOE43FZPn';
$data = array(
    // Merchant details
    'merchant_id' => '10000100',
    'merchant_key' => '46f0cd694581a',
    'return_url' => 'http://www.yourdomain.co.za/return.php',
    'cancel_url' => 'http://www.yourdomain.co.za/cancel.php',
    'notify_url' => 'http://www.yourdomain.co.za/notify.php',
    // Buyer details
    'name_first' => 'First Name',
    'name_last'  => 'Last Name',
    'email_address'=> 'test@test.com',
    // Transaction details
    'm_payment_id' => '1234', //Unique payment ID to pass through to notify_url
    'amount' => number_format( sprintf( '%.2f', $cartTotal ), 2, '.', '' ),
    'item_name' => 'Order#123'
);

$signature = generateSignature($data, $passphrase);
$data['signature'] = $signature;

// If in testing mode make use of either sandbox.payfast.co.za or www.payfast.co.za
$testingMode = true;
$pfHost = $testingMode ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
$htmlForm = '<form action="https://'.$pfHost.'/eng/process" method="post">';
foreach($data as $name=> $value)
{
    $htmlForm .= '<input name="'.$name.'" type="hidden" value=\''.$value.'\' />';
}
$htmlForm .= '<input type="submit" value="Pay Now" /></form>';
echo $htmlForm; 
Step 4: Confirm payment is successful
Before the customer is returned to the URL you specified in the “return_url” parameter, Payfast will send a notification to your “notify_url” page.
4.1. Setting up your notification page:



On receiving the payment notification from Payfast, return a header 200 to prevent further retries.
If no 200 response is returned the notification will be re-sent immediately, then after 10 minutes and then at exponentially longer intervals until eventually stopping.

If you are testing locally you will need to have a publicly accessible URL (notify_url) in order to receive the notifications, consider using tools such as NGROK or Expose to expose your local development server to the Internet.



4.2. Receive the notification parameters



As part of the notification you can expect to receive the following parameters:

Transaction details
m_payment_id
string, 100 charOPTIONAL
Unique payment ID on the merchant’s system.
pf_payment_id
integerREQUIRED
Unique transaction ID on Payfast.
payment_status
string (CANCELLED / COMPLETE)REQUIRED
After a successful payment the status sent will be COMPLETE. When a subscription is cancelled the status will be CANCELLED.
item_name
string, 100 charREQUIRED
The name of the item being charged for, or in the case of multiple items the order number.
item_description
string, 255 charOPTIONAL
The description of the item being charged for, or in the case of multiple items the order description.
amount_gross
decimalOPTIONAL
The total amount the customer paid in ZAR.
amount_fee
decimalOPTIONAL
The total in fees which was deducted from the amount in ZAR.
amount_net
decimalOPTIONAL
The net amount credited to the merchant’s account in ZAR.
custom_int<1..5>
integer, 255 charOPTIONAL
The series of 5 custom integer variables (custom_int1, custom_int2…) originally passed by the receiver during the payment request.
custom_str<1..5>
string, 255 charOPTIONAL
The series of 5 custom string variables (custom_str1, custom_str2…) originally passed by the receiver during the payment request.
Customer details
name_first
string, 100 charOPTIONAL
The customer’s first name.
name_last
string, 100 charOPTIONAL
The customer’s last name.
email_address
string, 100 charOPTIONAL
The customer’s email address.
Merchant details
merchant_id
integer, 8 charREQUIRED
The Merchant ID as given by the Payfast system. Used to uniquely identify the receiver’s account.
Recurring Billing details
token
string, 36 charREQUIRED
Unique ID on Payfast that represents the subscription.
billing_date
date, YYYY-MM-DDOPTIONAL
The date from which future subscription payments will be made. Eg. 2020-01-01. Defaults to current date if not set.
Security information
signature
MD5 hash in lower caseOPTIONAL
A security signature of the transmitted data taking the form of an MD5 hash of all the url encoded submitted variables.
Example of a Transaction Webhook Payload
Select library
$ITN_Payload = [
 'm_payment_id' => 'SuperUnique1',
 'pf_payment_id' => '1089250',
 'payment_status' => 'COMPLETE',
 'item_name' => 'test+product',
 'item_description' => ,
 'amount_gross' => 200.00,
 'amount_fee' => -4.60,
 'amount_net' => 195.40,
 'custom_str1' => ,
 'custom_str2' => ,
 'custom_str3' => ,
 'custom_str4' => ,
 'custom_str5' => ,
 'custom_int1' => ,
 'custom_int2' => ,
 'custom_int3' => ,
 'custom_int4' => ,
 'custom_int5' => ,
 'name_first' => ,
 'name_last' => ,
 'email_address' => ,
 'merchant_id' => '10012577',
 'signature' => 'ad8e7685c9522c24365d7ccea8cb3db7'
]; 
4.3. Conduct security checks



Conduct four security checks to ensure that the data you are receiving is correct, from the correct source and hasn’t been altered; you should not continue the process if a test fails!

Notification page
Select library
<?php
// Tell Payfast that this page is reachable by triggering a header 200
header( 'HTTP/1.0 200 OK' );
flush();

define( 'SANDBOX_MODE', true );
$pfHost = SANDBOX_MODE ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
// Posted variables from ITN
$pfData = $_POST;

// Strip any slashes in data
foreach( $pfData as $key => $val ) {
    $pfData[$key] = stripslashes( $val );
}

// Convert posted variables to a string
foreach( $pfData as $key => $val ) {
    if( $key !== 'signature' ) {
        $pfParamString .= $key .'='. urlencode( $val ) .'&';
    } else {
        break;
    }
}

$pfParamString = substr( $pfParamString, 0, -1 ); 

Verify the signature



Verify the security signature in the notification; this is done in a similar way that the signature that you generated for stage one of the user payment flow.

The string that gets created needs to include all fields posted from Payfast.

Verify Signature
Select library
<?php
function pfValidSignature( $pfData, $pfParamString, $pfPassphrase = null ) {
    // Calculate security signature
    if($pfPassphrase === null) {
        $tempParamString = $pfParamString;
    } else {
        $tempParamString = $pfParamString.'&passphrase='.urlencode( $pfPassphrase );
    }

    $signature = md5( $tempParamString );
    return ( $pfData['signature'] === $signature );
} 

Check that the notification has come from a valid Payfast domain



The following is a list of valid domains:
- www.payfast.co.za
- w1w.payfast.co.za
- w2w.payfast.co.za
- sandbox.payfast.co.za

Check valid Payfast domain
Select library
<?php
function pfValidIP() {
    // Variable initialization
    $validHosts = array(
        'www.payfast.co.za',
        'sandbox.payfast.co.za',
        'w1w.payfast.co.za',
        'w2w.payfast.co.za',
        );

    $validIps = [];

    foreach( $validHosts as $pfHostname ) {
        $ips = gethostbynamel( $pfHostname );

        if( $ips !== false )
            $validIps = array_merge( $validIps, $ips );
    }

    // Remove duplicates
    $validIps = array_unique( $validIps );
    $referrerIp = gethostbyname(parse_url($_SERVER['HTTP_REFERER'])['host']);
    if( in_array( $referrerIp, $validIps, true ) ) {
        return true;
    }
    return false;
} 

Compare payment data



The amount you expected the customer to pay should match the “amount_gross” value sent in the notification.

Compare payment data
Select library
<?php
function pfValidPaymentData( $cartTotal, $pfData ) {
    return !(abs((float)$cartTotal - (float)$pfData['amount_gross']) > 0.01);
} 

Perform a server request to confirm the details



Validate the data that you have received from Payfast by contacting our server and confirming the order details.

Live: https://www.payfast.co.za/​eng/query/validate
Sandbox: https://sandbox.payfast.co.za/​eng/query/validate

 

CURL OPTIONS
CURLOPT_RETURNTRANSFER	Set to TRUE to return the transfer as a string of the return value of curl_exec() instead of outputting it out directly.
CURLOPT_HEADER	Set to FALSE to exclude the header in the output.
CURLOPT_SSL_VERIFYHOST	Set to 2 to check the existence of a common name in the SSL peer certificate, and to also verify that it matches the hostname provided.
CURLOPT_SSL_VERIFYPEER	This option determines whether curl verifies the authenticity of the peer’s certificate. The default value is 1.
CURLOPT_URL	Set to the Payfast query validation URL, eg. https://www.payfast.co.za/eng/query/validate. This can also be set when initializing a session with curl_init().
CURLOPT_POST	Set to TRUE to do a regular HTTP POST. This POST is the normal application/x-www-form-urlencoded kind, most commonly used by HTML forms.
CURLOPT_POSTFIELDS	The full data to post via HTTP to Payfast. This parameter is passed as a urlencoded string, such as: m_payment_id=01&pf_payment_id=01234..
Server request to confirm details
Select library
<?php
function pfValidServerConfirmation( $pfParamString, $pfHost = 'sandbox.payfast.co.za', $pfProxy = null ) {
    // Use cURL (if available)
    if( in_array( 'curl', get_loaded_extensions(), true ) ) {
        // Variable initialization
        $url = 'https://'. $pfHost .'/eng/query/validate';

        // Create default cURL object
        $ch = curl_init();
    
        // Set cURL options - Use curl_setopt for greater PHP compatibility
        // Base settings
        curl_setopt( $ch, CURLOPT_USERAGENT, NULL );  // Set user agent
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );      // Return output as string rather than outputting it
        curl_setopt( $ch, CURLOPT_HEADER, false );             // Don't include header in output
        curl_setopt( $ch, CURLOPT_SSL_VERIFYHOST, 2 );
        curl_setopt( $ch, CURLOPT_SSL_VERIFYPEER, true );
        
        // Standard settings
        curl_setopt( $ch, CURLOPT_URL, $url );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt( $ch, CURLOPT_POSTFIELDS, $pfParamString );
        if( !empty( $pfProxy ) )
            curl_setopt( $ch, CURLOPT_PROXY, $pfProxy );
    
        // Execute cURL
        $response = curl_exec( $ch );
        curl_close( $ch );
        if ($response === 'VALID') {
            return true;
        }
    }
    return false;
} 
Bringing the checks together
Select library
<?php
$check1 = pfValidSignature($pfData, $pfParamString);
$check2 = pfValidIP();
$check3 = pfValidPaymentData($cartTotal, $pfData);
$check4 = pfValidServerConfirmation($pfParamString, $pfHost);

if($check1 && $check2 && $check3 && $check4) {
    // All checks have passed, the payment is successful
} else {
    // Some checks have failed, check payment manually and log for investigation
}  
Onsite Payments (Beta)

Integrate Payfast’s secure payment engine directly into the checkout page.

Integration

Integration is a simple two step process:

Important: Please note that for security reasons Onsite Payments requires that your application be served over HTTPS.
Step 1: Post payment details and get a unique payment identifier

The transaction and customer details need to be sent to Payfast before any customer interaction.

Live: https://www.payfast.co.za/onsite/​process
Sandbox: https://sandbox.payfast.co.za/onsite/​process

POST Data:
The POST data that is required can be found in the Quickstart guide.
The following are additional requirements for Onsite
signature
stringREQUIRED
The signature is a hash of the posted data used to ensure the integrity of the data transfer
email_address
string, 100 char REQUIRED UNLESS MOBILE REGISTRATION ALLOWED
The customer’s email address. This is required unless the merchant has specifically allowed mobile registration from their account.
cell_number
string, 100 char REQUIRED IF EMAIL NOT SET
The customer’s valid cell number. If the email_address field is empty, and cell_number provided, the system will use the cell_number as the username and auto login the user, if they do not have a registered account
If no return_url is submitted, the modal will just close on payment completion and customers will not be redirected to a success page.
POST /onsite/process
https://www.payfast.co.za/onsite/process 
RESPONSE
{
"uuid":
"123-abc"
}
Payment identifier generation
Select library
<?php
$passPhrase = 'jt7NOE43FZPn';
$data = [
    'merchant_id' => '10000100',
    'merchant_key' => '46f0cd694581a',
    ...
];

function dataToString($dataArray) {
  // Create parameter string
    $pfOutput = '';
    foreach( $dataArray as $key => $val ) {
        if($val !== '') {
            $pfOutput .= $key .'='. urlencode( trim( $val ) ) .'&';
        }
    }
    // Remove last ampersand
    return substr( $pfOutput, 0, -1 );
}

function generatePaymentIdentifier($pfParamString, $pfProxy = null) {
    // Use cURL (if available)
    if( in_array( 'curl', get_loaded_extensions(), true ) ) {
        // Variable initialization
        $url = 'https://www.payfast.co.za/onsite/process';

        // Create default cURL object
        $ch = curl_init();

        // Set cURL options - Use curl_setopt for greater PHP compatibility
        // Base settings
        curl_setopt( $ch, CURLOPT_USERAGENT, NULL );  // Set user agent
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );      // Return output as string rather than outputting it
        curl_setopt( $ch, CURLOPT_HEADER, false );             // Don't include header in output
        curl_setopt( $ch, CURLOPT_SSL_VERIFYHOST, 2 );
        curl_setopt( $ch, CURLOPT_SSL_VERIFYPEER, true );

        // Standard settings
        curl_setopt( $ch, CURLOPT_URL, $url );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt( $ch, CURLOPT_POSTFIELDS, $pfParamString );
        if( !empty( $pfProxy ) )
            curl_setopt( $ch, CURLOPT_PROXY, $pfProxy );

        // Execute cURL
        $response = curl_exec( $ch );
        curl_close( $ch );
        echo $response;
        $rsp = json_decode($response, true);
        if ($rsp['uuid']) {
            return $rsp['uuid'];
        }
    }
    return null;
}

// Generate signature (see Custom Integration -> Step 2)
$data["signature"] = generateSignature($data, $passPhrase);

// Convert the data array to a string
$pfParamString = dataToString($data);

// Generate payment identifier
$identifier = generatePaymentIdentifier($pfParamString); 
Step 2: Trigger the modal popup

Once you have successfully retrieved the above UUID for the payment you can pass that into the Javascript for the payment page initialisation.
Place the following script inside of your document to initialise the payment modal on your website.

There are 2 initialisation options for the modal that can be used depending on how you would like payment completion to be handled.
Onsite activation script
<script src="https://www.payfast.co.za/onsite/engine.js"></script> 
Method 1: Simple

This is the simplest method of triggering the payment modal.
All that is needed is to specify the uuid you received in the first step.
On payment success the buyer is redirected to your return url.

Additionally, if you did not specify the return and cancel urls while getting the unique identifier in step 1, you can add these to the call in this step.

Method 1 - Simple
window.payfast_do_onsite_payment({"uuid":"123-abc"}); 
Method 1 - With URLs
window.payfast_do_onsite_payment({
  "uuid":"123-abc",
  "return_url":"http://example.com",
  "cancel_url":"http://example.com"
}); 
Method 2: Callback

This method is triggered in the same way as the simple method, the difference is that with this method you can define a callback method.
On a final action (either a success or the user closing the popup) a call to the callback defined will be fired.

Important: When using the callback method, only the callback will be triggered and any return or cancel urls specified will be ignored!
Method 2 - Callback
window.payfast_do_onsite_payment({"uuid":"123-abc"}, function (result) {
  if (result === true) {
    // Payment Completed
  }
  else {
    // Payment Window Closed
  }
}); 
Payment Confirmation

A payment confirmation notification will be sent to the "notify_url" you specified.
The full implementation details can be found here.

Recurring Billing

Create two methods of recurring payments: Subscriptions and Tokenization.
For Recurring Billing only the credit card option can be used.

On successful payment completion and all subsequent recurring payments you will be sent a notification (see Confirm payment is successful).
A “token” parameter will be sent as part of the notification and is to be used for all further API calls related to the subscription.

On failed payments, Payfast will try a number of times to reprocess a payment where the customer does not have funds on their credit card. On failure, the customer will be notified, allowing some time for the problem to be resolved. On a complete failure (after X amount of times), the subscription will be ‘locked’ and will need some action from the merchant to reactivate on the Payfast account or via the API pause endpoint.


Custom integration
Recurring Billing is set up in exactly the same manner as standard payments (see the above Quickstart guide), with the addition of the following fields.
Subscriptions
A recurring charge on a given date.
Payfast will charge the credit card according to the frequency, billing date and number of payments (cycles) specified in the payment request.
Passphrase: Please note that for Subscriptions a passphrase is REQUIRED in your signature.
To get a passphrase while testing in the sandbox, visit https://sandbox.payfast.co.za, under SETTINGS edit the "Salt Passphrase". You can now use the new passphrase and merchant credentials for your sandbox testing.
Additional subscription form fields
subscription_type
integer, 1 charREQUIRED FOR SUBSCRIPTIONS
1 – sets type to a subscription
billing_date
date (YYYY-MM-DD)OPTIONAL
The date from which future subscription payments will be made. Eg. 2020-01-01. Defaults to current date if not set.
recurring_amount
decimalOPTIONAL
Future recurring amount for the subscription in ZAR. Defaults to the ‘amount’ value if not set. There is a minimum value of 5.00.
It is possible to set up a subscription or tokenization payment with an initial amount of R0.00. This would be used with subscriptions if the first cycle/period is free, or, in the case of tokenization payments it is used to set up the customers account on the merchants site, allowing for future payments. If the initial amount is R0.00 the customer will be redirected to Payfast, where they will input their credit card details and go through 3D Secure, but no money will be deducted.
frequency
integer, 1 charREQUIRED FOR SUBSCRIPTIONS
The cycle period.
   1 - Daily
   2 - Weekly
   3 - Monthly
   4 - Quarterly
   5 - Biannually
   6 - Annual
cycles
integer, 1 charREQUIRED FOR SUBSCRIPTIONS
The number of payments/cycles that will occur for this subscription. Set to 0 for indefinite subscription.
subscription_notify_email
booleanOPTIONAL
Send the merchant an email notification 7 days before a subscription trial ends, or before a subscription amount increases.
This setting is enabled by default and can be changed via the merchant dashboard: Settings -> Recurring Billing.
subscription_notify_webhook
booleanOPTIONAL
Send the merchant a webhook notification 7 days before a subscription trial ends, or before a subscription amount increases.
The webhook notification URL can be set via the merchant dashboard: Settings -> Recurring Billing.
subscription_notify_buyer
booleanOPTIONAL
Send the buyer an email notification 7 days before a subscription trial ends, or before a subscription amount increases.
This setting is enabled by default and can be changed via the merchant dashboard: Settings -> Recurring Billing.
Subscription Variables
<input type="hidden" name="subscription_type" value="1">
<input type="hidden" name="billing_date" value="2020-01-01">
<input type="hidden" name="recurring_amount" value="123.45">
<input type="hidden" name="frequency" value="3">
<input type="hidden" name="cycles" value="12">
<input type="hidden" name="subscription_notify_email" value="true">
<input type="hidden" name="subscription_notify_webhook" value="true">
<input type="hidden" name="subscription_notify_buyer" value="true">
 
SUBSCRIPTION TRIAL WEBHOOK SAMPLE
{
"type":
"subscription.free-trial",
"token":
"dc0521d3-55fe-269b-fa00-b647310d760f",
"initial_amount":
0,
"amount":
10000,
"next_run":
"2021-03-30",
"frequency":
"3",
"item_name":
"Test Item",
"item_description":
"A test product",
"name_first":
"John",
"name_last":
"Doe",
"email_address":
"john@example.com"
}
Webhook attributes
type
stringREQUIRED
The type of webhook being sent, can be one of 'subscription.free-trial', 'subscription.promo' or 'subscription.update'.
token
stringREQUIRED
The Unique ID on Payfast that represents the subscription.
initial_amount
integerREQUIRED
The initial amount payable during the free trial or promotion period, in cents (ZAR).
amount
integerREQUIRED
The subscription amount, in cents (ZAR).
next_run
YYYY-MM-DDOPTIONAL
The next run date for the subscription.
frequency
integer, 1 charOPTIONAL
The cycle period.
   1 - Daily
   2 - Weekly
   3 - Monthly
   4 - Quarterly
   5 - Biannually
   6 - Annual
item_name
string, 100 char OPTIONAL
The name of the item being charged for, or in the case of multiple items the order number.
item_description
string, 255 char OPTIONAL
The description of the item being charged for, or in the case of multiple items the order description.
name_first
string, 100 char OPTIONAL
The customer’s first name.
name_last
string, 100 char OPTIONAL
The customer’s last name.
email_address
string, 100 char OPTIONAL
The customer’s email address.
Tokenization
A recurring charge where the future dates and amounts of payments may be unknown.
Payfast will only charge the customer's card when instructed to do so via the API.
Tokenization payment agreements can be setup without charging the customer.
Additional tokenization form fields
subscription_type
integer, 1 charREQUIRED FOR SUBSCRIPTIONS
2 – sets type to a tokenization payment
Tokenization Variable
<input type="hidden" name="subscription_type" value="2"> 
Update card details
Provide buyers with a link to update their card details on a Recurring Billing subscription or Tokenization charges. This link will redirect them to Payfast in order to perform the update securely.
Additional tokenization form fields
token
stringREQUIRED
The buyers recurring billing subscription or recurring adhoc token
return
string, no char limitOPTIONAL
The URL where the buyer is returned to after updating their card details (or cancelling the update). If no return url is supplied there will be no redirect.
GET /eng/recurring/update
https://www.payfast.co.za/eng/recurring/update/{token}?return={return} 
Example Usage
<a href="https://www.payfast.co.za/eng/recurring/update/00000000-0000-0000-0000-000000000000?return=http://store.example.com">Update the card for your subscription</a> 
Additional methods of integrating Recurring Billing
For more information on other ways of setting up Subscriptions, such as through a Pay Now button, Payment Request or ecommerce platform plugins, click here
Recurring Billing maintenance



Subscriptions can be edited, paused and cancelled either via the Payfast dashboard or the API.

Update: Payfast dashboard guide | API guide
Pause: Payfast dashboard guide | API guide
Cancel: Payfast dashboard guide | API guide
Split Payments

Instantly split a portion of an online payment with a third party. Read more

Initial setup
You will need to enable Split Payments on your account. Setup details can be found here.
Only one receiving merchant can be allocated a Split Payment, per split transaction. Therefore the Merchant ID of this receiving merchant is mandatory.
All amounts used for the split must be in cents.

There are two methods of splitting a payment:

Global setup: By contacting Payfast support you can have a split setup on your account that will take affect on every transaction.


Direct request: Send the split data (see additional form fields below) embedded in the payment request. This gives you the flexibility to determine which payments a split should take affect on.
The data sent in this request will take precedence over anything setup on your account.

Where the request involved Recurring Billing, the split data will continue to be used on all subsequent recurring payments.



Additional Split Payment form fields
setup
string, JSON encodedREQUIRED FOR SPLIT PAYMENTS
NB: Not included in the signature.
The value for setup needs to contain the JSON encoded payload for split_payment as shown in the example.
merchant_id
integer, 8 charREQUIRED
The third party merchant that the payment is being split with.
amount
integerREQUIRED IF NOT USING PERCENTAGE
The amount in cents (ZAR), that will go to the third party merchant.
percentage
integer, 2 charREQUIRED IF NOT USING AMOUNT
The percentage allocated to the third party merchant.
min
integerOPTIONAL
The minimum amount that will be split, in cents (ZAR)
max
integerOPTIONAL
The maximum amount that will be split, in cents (ZAR)
Split Payment input
<input type="hidden" name="setup" value='{
  "split_payment" : {
    "merchant_id":10000105,
    "percentage":10,
    "min":100,
    "max":100000
  }
}'> 
Split Payment calculation


1. If both percentage and amount are specified, then the percentage will be deducted first, and then the amount will be deducted from the rest.

Split amount: (40,000 – (40,000/10)) – 500) = 35,500 cents

FOR EXAMPLE ON AN AMOUNT OF R400 (40000 CENTS)
{
"split_payment":
{
"merchant_id":
10000105,
"percentage":
10,
"amount":
500,
"min":
100,
"max":
100000
}
}
2. If the split amount is smaller than the min, then the min will be used instead of the split amount.

Split amount: (6,000 – 5500) = 500 cents (< min) = 1000 cents
FOR EXAMPLE ON AN AMOUNT OF R60 (6000 CENTS)
{
"split_payment":
{
"merchant_id":
10000105,
"amount":
5500,
"min":
1000,
"max":
100000
}
}
3. If the split amount is bigger than the max, then the max will be used instead of the split amount.

Split amount: 40,000 – (40,000/10) = 36,000 cents (> max) = 20 000 cents
FOR EXAMPLE ON AN AMOUNT OF R400 (40000 CENTS)
{
"split_payment":
{
"merchant_id":
10000105,
"percentage":
10,
"min":
100,
"max":
20000
}
}
PCI compliance

Payfast is PCI DSS level 1 compliant. PCI DSS stands for Payment Card Industry Data Security Standard and is a PASA (Payment Association of South Africa) regulation in South Africa, this means any company accepting credit card payments on their website needs to comply in some way.

Outsourcing your card payments to Payfast means you do not have to be concerned about the laborious process of being PCI compliant, and can rest assured in the knowledge that card information is handled securely.

For more information on PCI compliance you can refer our blog post, or to the PCI security standards best practices. You can, if need be, take the PCI self assessment questionaire.
Testing and tools

Use our Sandbox to test your integration before going live.

SDKs & Libraries
SDKs and libraries take the complexity out of integrations by providing language-specific APIs for Payfast services.
PHP SDK

The Payfast PHP SDK includes Custom Integration, Onsite Integration and all APIs.

Github

The Sandbox
The Payfast Sandbox is an exact code duplicate of the production site, available for running test transactions with.
Any transactions made or actions performed on this system are isolated from the main production environment, while providing a realistic experience of your integration with Payfast, before going live.
Using our Sandbox, you will be able to test your integration, once off payments and recurring payments, as well as receive ITNs, without any money changing hands.
Sandbox URL
https://sandbox.payfast.co.za 
Getting started:
To get started proceed to the above URL and enter your email address. The Sandbox dashboard has everything you need to test your integration. We recommend spending some time and familiarising yourself with the dashboard. There are helpful hints and tips to guide you on each page.
Payment methods:
The Sandbox allows you to test your integration without any money changing hands. The Sandbox makes use of a single payment method – a wallet with a substantially large dummy balance. While it is not possible to utilise the other payment methods in Sandbox, this will not affect your integration.
Sandbox is simply a tool to test your integration, the actual payment screen can not be simulated while performing test transactions. The Sandbox does not make any connections to external systems (allowing all payments to be successful).
Payment notifications:
The Sandbox will only send payment notifications once. You can view all sent notifications by navigating to ITN (Instant transaction notification) in the Sandbox.
Setting a passphrase:
This is required for all subscription and tokenization payments. It is the ‘salt’ added to your parameter string before generating the signature. To add or change your passphrase, simply visit the Account Information Tab on the left hand side and enter or edit your passphrase in the ’Salt Passphrase’ input field.
Integration tools:
This section has been built to help you detect issues with your signature and assist where possible. The signature tool tests and evaluates a given parameter string and gives a result based on your input.
Test your integration:
This section was created to see what your signature should be with all your given variables. Fill out the form and click generate signature to allow Payfast to generate the correct signature for you and then submit to Payfast Sandbox. You will have the option to send through incorrect variables to see how we respond to certain variables.
Sandbox limitations:
The Sandbox does not make any connections to external systems (allowing all payments to be successful). Because the Sandbox makes use of Payfast's own personal buyer behind the scenes, all fields containing the party table will yield Test Buyer. This will not be the case when going live.
Recurring Billing tools:
Recurring Billing transactions require a passphrase to be set.

Subscriptions and tokenization payments completed in Sandbox can be viewed on your Sandbox account. Just like on the Payfast merchant account, you will be able to cancel, charge, pause and edit subscriptions. For tokenization payments, you will be able to charge and cancel them.

When editing a subscription you can change the amount, the number of cycles (payments), the next payment date and the frequency.

The subscription token does not display in the Sandbox, so be sure to capture this from the ITN!
Test transaction setup
Merchant Details:
To get started you can use the credentials provided in your Sandbox, or you can use the following test credentials:
Merchant Credentials
Merchant ID: 10000100
Merchant Key: 46f0cd694581a
Merchant Passphrase: jt7NOE43FZPn 
These credentials can be found on your live or Sandbox dashboard after you have logged in.

They are unique to your account but the Sandbox merchant_id and merchant_key has no correlation to your live account.
SANDBOX URLS:
Post payment URL	https://sandbox.payfast.co.za/eng/process
Transaction notification URL	https://sandbox.payfast.co.za/eng/query/validate
Make payment:
Buyer credentials:
Username:     sbtu01@payfast.io
Password:     clientpass

Payfast wallet:
For a once off payment, you will see the amount given for the transaction, and a Payfast wallet (which is reset to R99,999,999.99 every night). Complete the test transaction by clicking ‘Pay Now Using Your Wallet’.
Recurring payment:
For a recurring payment, you will see a message about the recurring payment, as well as a test credit card and cvv number. In order to make the test payment, select the credit card and enter the cvv number provided and click ‘Pay’.
Subscriptions require a Sandbox account with passphrase setup.
Payment success:
Transaction notifications:
View the success transaction notification by navigating to ITN (Instant transaction notification) in the Sandbox.
Going Live
If you have ensured that your inputs to Payfast are correct in test transactions with the Sandbox, and have ensured that you can handle the appropriate responses, there should be no reason why the live system should perform any differently

To make your payments live, simply switch to your live credentials and the live URLs.
LIVE URLS:
Post payment URL	https://www.payfast.co.za/eng/process
Transaction notification URL	https://www.payfast.co.za/eng/query/validate
Merchant credentials:
Make sure that you have switched to your live Merchant ID and Merchant Key.
Test transactions:
Any payments transferred while testing live will appear in your Payfast wallet. It can then simply be paid out, once you are finished with the testing.

As per our requirements, you will not be able to process payments with an amount less than ZAR 5.00

Please note that any “test” transactions processed this way will be subject to the agreed transaction fees which can unfortunately not be refunded.
Widgets

Add one of our Payfast widgets onto your website product page to display useful payment information.

MoreTyme
MoreTyme Add-ons for Your Website
Create a personalised widget for your product web pages and increase sales on your site.
The widget informs your customers how much they need to pay upfront and for the next two payments with MoreTyme.

Preview:
Edit Widget

Pay R 333.34 now with
and the rest in 2 interest-free payments. 
Learn More

Code Snippet:

Copy the code snippet into your website linked to the relevant product display, and simply change the amount to the price of the product displayed.
Custom
Shopify
WooCommerce
<script async src="https://content.payfast.io/widgets/moretyme/widget.min.js?amount={product_price}" type="text/javascript"></script>
Copy Code
MoreTyme Marketing Banner
Download MoreTyme marketing material to promote this buy now, pay later payment method on your website.
 Download
Ports and IP addresses

The following information can be used by system administrators if any changes need to be made to your servers when integrating with Payfast.

Ports
When communicating with the notify url via the ITN, Payfast makes use of ports 80, 8080, 8081 and 443 only.
IP addresses 
Updated
These are the Payfast server IPs. Our information can come from any of these IPs and we recommend white-listing all of these IPs.
IP Addresses
197.97.145.144/28 (197.97.145.144 - 197.97.145.159)
41.74.179.192/27 (41.74.179.192 – 41.74.179.223)
102.216.36.0/28 (102.216.36.0 - 102.216.36.15)
102.216.36.128/28 (102.216.36.128 - 102.216.36.143)
144.126.193.139 
FAQs

If your questions are not answered here, please see our Knowledge Base.

2026 — Payfast | All right reserved.
PCI-DSS Level 1 Service Provider Compliant
v0.1.24