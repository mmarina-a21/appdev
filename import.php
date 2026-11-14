<?php
// Set the content type to JSON to ensure the response is in JSON format
header('Content-Type: application/json');

// Database connection parameters
$servername = "localhost";
$username = "root"; // Default XAMPP username
$password = ""; // Default XAMPP password is empty
$dbname = "health_risk_factors";

// Create a connection to the MySQL database
$conn = new mysqli($servername, $username, $password, $dbname);

// Check if the connection was successful
if ($conn->connect_error) {
    // If the connection failed, output an error message and terminate the script
    die("Connection failed: " . $conn->connect_error);
}

// Path to the CSV file containing the data
$csvFile = 'number-of-deaths-by-risk-factor.csv'; // Make sure the path is correct
$handle = fopen($csvFile, 'r');

// Check if the file was opened successfully
if ($handle === FALSE) {
    // If the file could not be opened, output an error message and terminate the script
    die(json_encode(["error" => "Error opening the file."]));
}

// Read the header row from the CSV file
$header = fgetcsv($handle);
if ($header === FALSE || count($header) != 31) {
    // If the header row is invalid or does not have the expected number of columns, output an error message and terminate the script
    die(json_encode(["error" => "Invalid column count in CSV header."]));
}

// Prepare the SQL statement for inserting data into the health_data table
$sql = "INSERT INTO health_data (
    entity, year, unsafe_water_source, unsafe_sanitation, no_access_to_handwashing_facility,
    household_air_pollution_from_solid_fuels, non_exclusive_breastfeeding, discontinued_breastfeeding,
    child_wasting, child_stunting, low_birth_weight_for_gestation, secondhand_smoke, alcohol_use,
    drug_use, diet_low_in_fruits, diet_low_in_vegetables, unsafe_sex, low_physical_activity,
    high_fasting_plasma_glucose, high_total_cholesterol, high_body_mass_index, high_systolic_blood_pressure,
    smoking, iron_deficiency, vitamin_a_deficiency, low_bone_mineral_density, air_pollution,
    outdoor_air_pollution, diet_high_in_sodium, diet_low_in_whole_grains, diet_low_in_nuts_and_seeds
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

// Prepare the statement using the database connection
$stmt = $conn->prepare($sql);

// Check if the statement was prepared successfully
if (!$stmt) {
    // If the statement preparation failed, output an error message and terminate the script
    die(json_encode(["error" => "Failed to prepare statement: " . $conn->error]));
}

// Initialize a variable to keep track of the number of rows inserted
$rowsInserted = 0;

// Read each row of the CSV file and insert the data into the database
while (($row = fgetcsv($handle)) !== FALSE) {
    // Ensure each row matches the expected column count
    if (count($row) != 31) {
        continue; // Skip invalid rows
    }
    // Bind the parameters to the SQL statement
    $stmt->bind_param('si' . str_repeat('d', 29), 
        $row[0], $row[1], $row[2], $row[3], $row[4], $row[5], $row[6], $row[7], $row[8], $row[9], 
        $row[10], $row[11], $row[12], $row[13], $row[14], $row[15], $row[16], $row[17], $row[18], $row[19], 
        $row[20], $row[21], $row[22], $row[23], $row[24], $row[25], $row[26], $row[27], $row[28], $row[29], 
        $row[30]
    );
    // Execute the SQL statement
    $stmt->execute();
    // Increment the count of inserted rows
    $rowsInserted++;
}

// Close the statement
$stmt->close();
// Close the database connection
$conn->close();
// Close the CSV file handle
fclose($handle);

// Output a success message with the number of rows inserted
echo json_encode(["message" => "Data imported successfully.", "rows_inserted" => $rowsInserted]);
?>
