<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit();
}

$allowed = [
    "teacher",
    "student",
    "subject",
    "lesson",
    "review",
    "payment",
    "schedule",
    "messages"
];

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$path = trim($path, "/");
$parts = explode("/", $path);
$scriptIndex = array_search("index.php", $parts);

if ($scriptIndex !== false) {
    $resource = $parts[$scriptIndex + 1] ?? null;
    $id = $parts[$scriptIndex + 2] ?? null;
} else {
    $resource = $parts[count($parts) - 1] ?? null;
    $id = null;
}

if (!$resource || !in_array($resource, $allowed)) {
    http_response_code(404);
    echo json_encode(["message" => "resource not found"]);
    exit();
}

$dbHost = getenv("DB_HOST") ?: "localhost";
$dbUser = getenv("DB_USER") ?: "root";
$dbPass = getenv("DB_PASS") ?: "";
$dbName = getenv("DB_NAME") ?: "tutors";

mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
$useDatabase = !$conn->connect_error;

if ($useDatabase) {
    $conn->set_charset("utf8");
}

function demo_data() {
    return [
        "teacher" => [
            ["id" => "1", "name" => "Іван Петренко"],
            ["id" => "2", "name" => "Олена Коваль"],
            ["id" => "3", "name" => "Марія Шевченко"]
        ],
        "student" => [
            ["id" => "1", "name" => "Андрій Мельник"],
            ["id" => "2", "name" => "Софія Бондар"],
            ["id" => "3", "name" => "Максим Іванов"]
        ],
        "subject" => [
            ["id" => "1", "name" => "Математика"],
            ["id" => "2", "name" => "Англійська мова"],
            ["id" => "3", "name" => "Фізика"]
        ],
        "schedule" => [
            ["id" => "1", "name" => "Понеділок 15:00"],
            ["id" => "2", "name" => "Середа 17:30"],
            ["id" => "3", "name" => "П'ятниця 14:00"]
        ],
        "review" => [
            ["id" => "1", "name" => "Чудове пояснення"],
            ["id" => "2", "name" => "Корисний урок"],
            ["id" => "3", "name" => "Потрібно більше практики"]
        ],
        "payment" => [
            ["id" => "1", "name" => "500 грн"],
            ["id" => "2", "name" => "650 грн"],
            ["id" => "3", "name" => "700 грн"]
        ],
        "lesson" => [
            ["id" => "1", "teacher_id" => "1", "student_id" => "1", "subject_id" => "1", "schedule_id" => "1", "review_id" => "1", "payment_id" => "1", "date" => "2026-06-03"],
            ["id" => "2", "teacher_id" => "2", "student_id" => "2", "subject_id" => "2", "schedule_id" => "2", "review_id" => "2", "payment_id" => "2", "date" => "2026-06-05"],
            ["id" => "3", "teacher_id" => "3", "student_id" => "3", "subject_id" => "3", "schedule_id" => "3", "review_id" => "3", "payment_id" => "3", "date" => "2026-06-07"]
        ],
        "messages" => []
    ];
}

function storage_path() {
    return __DIR__ . "/data.json";
}

function read_storage() {
    $path = storage_path();

    if (!file_exists($path)) {
        file_put_contents($path, json_encode(demo_data(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }

    $data = json_decode(file_get_contents($path), true);
    return $data ?: demo_data();
}

function write_storage($data) {
    file_put_contents(storage_path(), json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function table_columns($conn, $table) {
    $columns = [];
    $res = $conn->query("SHOW COLUMNS FROM `$table`");

    while ($row = $res->fetch_assoc()) {
        $columns[] = $row["Field"];
    }

    return $columns;
}

function clean_data($conn, $table, $data) {
    $columns = table_columns($conn, $table);
    $clean = [];

    foreach ($data as $key => $value) {
        if ($key !== "id" && in_array($key, $columns)) {
            $clean[$key] = $conn->real_escape_string($value);
        }
    }

    return $clean;
}

function next_id($rows) {
    $max = 0;

    foreach ($rows as $row) {
        $max = max($max, (int)$row["id"]);
    }

    return (string)($max + 1);
}

$method = $_SERVER['REQUEST_METHOD'];

if (!$useDatabase) {
    $data = read_storage();
    $rows = $data[$resource] ?? [];

    if ($method === "GET") {
        if ($id) {
            foreach ($rows as $row) {
                if ((string)$row["id"] === (string)$id) {
                    echo json_encode($row, JSON_UNESCAPED_UNICODE);
                    exit();
                }
            }

            echo json_encode(null);
            exit();
        }

        echo json_encode($rows, JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === "POST") {
        $body = json_decode(file_get_contents("php://input"), true) ?: [];
        $body["id"] = next_id($rows);
        $data[$resource][] = $body;
        write_storage($data);
        echo json_encode($body, JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === "PUT") {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "id required"]);
            exit();
        }

        $body = json_decode(file_get_contents("php://input"), true) ?: [];
        $updated = null;

        foreach ($data[$resource] as $index => $row) {
            if ((string)$row["id"] === (string)$id) {
                $updated = array_merge($row, $body, ["id" => (string)$id]);
                $data[$resource][$index] = $updated;
                break;
            }
        }

        if (!$updated) {
            http_response_code(404);
            echo json_encode(["message" => "record not found"]);
            exit();
        }

        write_storage($data);
        echo json_encode($updated, JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === "DELETE") {
        $data[$resource] = array_values(array_filter($rows, function ($row) use ($id) {
            return (string)$row["id"] !== (string)$id;
        }));
        write_storage($data);
        http_response_code(204);
        exit();
    }
}

if ($method === "GET") {
    if ($id) {
        $id = (int)$id;
        $res = $conn->query("SELECT * FROM `$resource` WHERE id=$id");
        echo json_encode($res->fetch_assoc(), JSON_UNESCAPED_UNICODE);
        exit();
    }

    $res = $conn->query("SELECT * FROM `$resource`");
    $data = [];

    while ($row = $res->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    $clean = clean_data($conn, $resource, $data ?? []);

    if (count($clean) === 0) {
        http_response_code(400);
        echo json_encode(["message" => "no data"]);
        exit();
    }

    $columns = "`" . implode("`, `", array_keys($clean)) . "`";
    $values = "'" . implode("', '", array_values($clean)) . "'";
    $conn->query("INSERT INTO `$resource` ($columns) VALUES ($values)");

    $newId = $conn->insert_id;
    $res = $conn->query("SELECT * FROM `$resource` WHERE id=$newId");
    echo json_encode($res->fetch_assoc(), JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "PUT") {
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "id required"]);
        exit();
    }

    $id = (int)$id;
    $data = json_decode(file_get_contents("php://input"), true);
    $clean = clean_data($conn, $resource, $data ?? []);
    $updates = [];

    foreach ($clean as $key => $value) {
        $updates[] = "`$key`='$value'";
    }

    if (count($updates) === 0) {
        http_response_code(400);
        echo json_encode(["message" => "no data"]);
        exit();
    }

    $conn->query("UPDATE `$resource` SET " . implode(", ", $updates) . " WHERE id=$id");
    $res = $conn->query("SELECT * FROM `$resource` WHERE id=$id");
    echo json_encode($res->fetch_assoc(), JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "DELETE") {
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "id required"]);
        exit();
    }

    $id = (int)$id;
    $conn->query("DELETE FROM `$resource` WHERE id=$id");
    http_response_code(204);
    exit();
}

http_response_code(405);
echo json_encode(["message" => "method not allowed"]);
