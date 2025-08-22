<?php
// Configura tu API KEY

$apiKey = 'MGMlbTG_APORWozDtgXHdQ';

// Detectar entorno
$environment = getenv('ENVIRONMENT') ?: 'local';

// URLs a consumir
$tournamentResultUrl = "https://www.golfgenius.com/api_v2/$apiKey/events/10733818833262361649/rounds/10733997716737637783/tournaments/11025765214984354975";
$masterRosterUrl = "https://www.golfgenius.com/api_v2/$apiKey/master_roster?photo=true";


// Función para obtener datos desde una URL según el entorno
function getJson($url)
{
    global $environment;
    if ($environment === 'production') {
        // Producción: usar cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $response = curl_exec($ch);
        if (curl_errno($ch)) {
            error_log('cURL error: ' . curl_error($ch));
            curl_close($ch);
            return null;
        }
        curl_close($ch);
        return json_decode($response, true, 512, JSON_BIGINT_AS_STRING);
    } else {
        // Local: usar file_get_contents
        $opts = [
            "http" => [
                "method" => "GET",
                "header" => "Content-Type: application/json"
            ]
        ];
        $context = stream_context_create($opts);
        $json = file_get_contents($url, false, $context);
        return json_decode($json, true, 512, JSON_BIGINT_AS_STRING);
    }
}




// Obtener datos desde Golf Genius
$tournamentData = getJson($tournamentResultUrl);
$rosterData = getJson($masterRosterUrl);

// Indexar fotos por member_card_id (como string)
$photoMap = [];
foreach ($rosterData as $entry) {
    $member = $entry['member'];
    $cardId = $member['member_card_id'] ?? null;
    $photo = $member['custom_fields']['photo'] ?? null;

    if ($cardId && $photo && filter_var($photo, FILTER_VALIDATE_URL)) {
        $photoMap[strval($cardId)] = $photo;
    }
}

// Procesar resultados del torneo
$processedResults = [];
foreach ($tournamentData['event']['scopes'][0]['aggregates'] as $player) {
    $processedResults[] = [
        'member_card_id' => strval($player['member_cards'][0]['member_card_id']), // Forzar a string
        'position' => $player['position'],
        'name' => $player['name'],
        'total' => $player['total'],
        'score' => $player['score'],
        'rounds' => $player['rounds']
    ];
}

// Salida combinada como JSON
header('Content-Type: application/json');
echo json_encode([
    'results' => $processedResults,
    'roster' => $photoMap
]);
