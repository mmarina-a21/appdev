<?php
// Set the content type to JSON to ensure the response is in JSON format
header('Content-Type: application/json');

// Database connection parameters
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "health_risk_factors";

// Create a connection to the MySQL database
$conn = new mysqli($servername, $username, $password, $dbname);

// Check if the connection was successful
if ($conn->connect_error) {
    // If the connection failed, output an error message and terminate the script
    die("Connection failed: " . $conn->connect_error);
}

// SQL query to select all data from the health_data table
$sql = "SELECT * FROM health_data";
$result = $conn->query($sql);

// Initialize an array to store the fetched data
$data = array();

// Fetch each row of the result set as an associative array and add it to the data array
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

// Encode the data array into JSON format and output it
echo json_encode($data);

// Close the database connection
$conn->close();
?>
