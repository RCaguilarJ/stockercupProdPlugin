<?php
/**
 * Plugin Name: stockercup
 * Plugin URI: https://yoursite.com
 * Description: A WordPress plugin to display golf tournament leaderboards with admin controls for round selection.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: stoker-cup
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GOLF_LEADERBOARD_PLUGIN_URL', plugin_dir_url(__FILE__));
define('GOLF_LEADERBOARD_PLUGIN_PATH', plugin_dir_path(__FILE__));

class GolfLeaderboardPlugin {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_ajax_get_leaderboard_data', array($this, 'ajax_get_leaderboard_data'));
        add_action('wp_ajax_nopriv_get_leaderboard_data', array($this, 'ajax_get_leaderboard_data'));
        add_shortcode('golf_leaderboard', array($this, 'shortcode_display'));
        
        // Create database table on activation
        register_activation_hook(__FILE__, array($this, 'create_tables'));
    }
    
    public function init() {
        // Plugin initialization
    }
    
    public function create_tables() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'golf_leaderboard_settings';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            setting_name varchar(100) NOT NULL,
            setting_value text NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY setting_name (setting_name)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Insert default settings
        $this->insert_default_settings();
    }
    
    private function insert_default_settings() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'golf_leaderboard_settings';
        
        $default_rounds = json_encode([
            ['id' => '10733997704590933397', 'name' => 'Round 1', 'date' => '2024-10-17'],
            ['id' => '10733997711201156502', 'name' => 'Round 2', 'date' => '2024-10-18'],
            ['id' => '10733997716737637783', 'name' => 'Round 3', 'date' => '2024-10-19']
        ]);
        
        $wpdb->replace($table_name, [
            'setting_name' => 'api_key',
            'setting_value' => 'MGMlbTG_APORWozDtgXHdQ'
        ]);
        
        $wpdb->replace($table_name, [
            'setting_name' => 'event_id',
            'setting_value' => '10733818833262361649'
        ]);
        
        $wpdb->replace($table_name, [
            'setting_name' => 'tournament_id',
            'setting_value' => '11025765214984354975'
        ]);
        
        $wpdb->replace($table_name, [
            'setting_name' => 'available_rounds',
            'setting_value' => $default_rounds
        ]);
        
        $wpdb->replace($table_name, [
            'setting_name' => 'selected_round',
            'setting_value' => '10733997716737637783'
        ]);
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'Golf Leaderboard',
            'Golf Leaderboard',
            'manage_options',
            'golf-leaderboard',
            array($this, 'admin_page'),
            'dashicons-awards',
            30
        );
    }
    
    public function admin_page() {
        if (isset($_POST['submit'])) {
            $this->save_admin_settings();
        }
        
        $settings = $this->get_all_settings();
        ?>
        <div class="wrap">
            <h1>Golf Leaderboard Settings</h1>
            <form method="post" action="">
                <?php wp_nonce_field('golf_leaderboard_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">API Key</th>
                        <td>
                            <input type="text" name="api_key" value="<?php echo esc_attr($settings['api_key']); ?>" class="regular-text" />
                            <p class="description">Your Golf Genius API key</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Event ID</th>
                        <td>
                            <input type="text" name="event_id" value="<?php echo esc_attr($settings['event_id']); ?>" class="regular-text" />
                            <p class="description">Golf Genius Event ID</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Tournament ID</th>
                        <td>
                            <input type="text" name="tournament_id" value="<?php echo esc_attr($settings['tournament_id']); ?>" class="regular-text" />
                            <p class="description">Golf Genius Tournament ID</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Select Round to Display</th>
                        <td>
                            <select name="selected_round" id="selected_round">
                                <?php
                                $rounds = json_decode($settings['available_rounds'], true);
                                foreach ($rounds as $round) {
                                    $selected = ($round['id'] == $settings['selected_round']) ? 'selected' : '';
                                    echo "<option value='{$round['id']}' {$selected}>{$round['name']} ({$round['date']})</option>";
                                }
                                ?>
                            </select>
                            <p class="description">Choose which round to display on the frontend</p>
                        </td>
                    </tr>
                </table>
                
                <h3>Manage Rounds</h3>
                <div id="rounds-container">
                    <?php
                    $rounds = json_decode($settings['available_rounds'], true);
                    foreach ($rounds as $index => $round) {
                        ?>
                        <div class="round-item" style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd;">
                            <input type="text" name="rounds[<?php echo $index; ?>][name]" value="<?php echo esc_attr($round['name']); ?>" placeholder="Round Name" />
                            <input type="text" name="rounds[<?php echo $index; ?>][id]" value="<?php echo esc_attr($round['id']); ?>" placeholder="Round ID" />
                            <input type="date" name="rounds[<?php echo $index; ?>][date]" value="<?php echo esc_attr($round['date']); ?>" />
                            <button type="button" class="button remove-round">Remove</button>
                        </div>
                        <?php
                    }
                    ?>
                </div>
                <button type="button" id="add-round" class="button">Add Round</button>
                
                <?php submit_button(); ?>
            </form>
            
            <h3>Shortcode Usage</h3>
            <p>Use the following shortcode to display the leaderboard:</p>
            <code>[golf_leaderboard]</code>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            let roundIndex = <?php echo count($rounds); ?>;
            
            $('#add-round').click(function() {
                const roundHtml = `
                    <div class="round-item" style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd;">
                        <input type="text" name="rounds[${roundIndex}][name]" placeholder="Round Name" />
                        <input type="text" name="rounds[${roundIndex}][id]" placeholder="Round ID" />
                        <input type="date" name="rounds[${roundIndex}][date]" />
                        <button type="button" class="button remove-round">Remove</button>
                    </div>
                `;
                $('#rounds-container').append(roundHtml);
                roundIndex++;
            });
            
            $(document).on('click', '.remove-round', function() {
                $(this).closest('.round-item').remove();
            });
        });
        </script>
        <?php
    }
    
    private function save_admin_settings() {
        if (!wp_verify_nonce($_POST['_wpnonce'], 'golf_leaderboard_settings')) {
            return;
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'golf_leaderboard_settings';
        
        // Save basic settings
        $settings = ['api_key', 'event_id', 'tournament_id', 'selected_round'];
        foreach ($settings as $setting) {
            if (isset($_POST[$setting])) {
                $wpdb->replace($table_name, [
                    'setting_name' => $setting,
                    'setting_value' => sanitize_text_field($_POST[$setting])
                ]);
            }
        }
        
        // Save rounds
        if (isset($_POST['rounds'])) {
            $rounds = [];
            foreach ($_POST['rounds'] as $round) {
                if (!empty($round['name']) && !empty($round['id'])) {
                    $rounds[] = [
                        'name' => sanitize_text_field($round['name']),
                        'id' => sanitize_text_field($round['id']),
                        'date' => sanitize_text_field($round['date'])
                    ];
                }
            }
            
            $wpdb->replace($table_name, [
                'setting_name' => 'available_rounds',
                'setting_value' => json_encode($rounds)
            ]);
        }
        
        echo '<div class="notice notice-success"><p>Settings saved successfully!</p></div>';
    }
    
    private function get_setting($name) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'golf_leaderboard_settings';
        
        $result = $wpdb->get_var($wpdb->prepare(
            "SELECT setting_value FROM $table_name WHERE setting_name = %s",
            $name
        ));
        
        return $result;
    }
    
    private function get_all_settings() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'golf_leaderboard_settings';
        
        $results = $wpdb->get_results("SELECT setting_name, setting_value FROM $table_name", ARRAY_A);
        
        $settings = [];
        foreach ($results as $result) {
            $settings[$result['setting_name']] = $result['setting_value'];
        }
        
        return $settings;
    }
    
    public function enqueue_frontend_scripts() {
        // Dynamic versioning based on file modification time
        $css_file = GOLF_LEADERBOARD_PLUGIN_PATH . 'assets/frontend.css';
        $js_file = GOLF_LEADERBOARD_PLUGIN_PATH . 'assets/frontend.js';
        
        $css_version = file_exists($css_file) ? filemtime($css_file) : '1.0.0';
        $js_version = file_exists($js_file) ? filemtime($js_file) : '1.0.0';
        
        wp_enqueue_script('golf-leaderboard-js', GOLF_LEADERBOARD_PLUGIN_URL . 'assets/frontend.js', ['jquery'], $js_version, true);
        wp_enqueue_style('golf-leaderboard-css', GOLF_LEADERBOARD_PLUGIN_URL . 'assets/frontend.css', [], $css_version);
        
        wp_localize_script('golf-leaderboard-js', 'golfLeaderboard', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('golf_leaderboard_nonce')
        ]);
    }
    
    public function enqueue_admin_scripts($hook) {
        if ($hook !== 'toplevel_page_golf-leaderboard') {
            return;
        }
        wp_enqueue_script('jquery');
    }
    
    public function ajax_get_leaderboard_data() {
        check_ajax_referer('golf_leaderboard_nonce', 'nonce');
        
        $settings = $this->get_all_settings();
        $selected_round = $settings['selected_round'];
        
        $api_key = $settings['api_key'];
        $event_id = $settings['event_id'];
        $tournament_id = $settings['tournament_id'];
        
        $tournament_url = "https://www.golfgenius.com/api_v2/{$api_key}/events/{$event_id}/rounds/{$selected_round}/tournaments/{$tournament_id}";
        $roster_url = "https://www.golfgenius.com/api_v2/{$api_key}/master_roster?photo=true";
        
        $tournament_data = $this->get_json($tournament_url);
        $roster_data = $this->get_json($roster_url);
        
        if (!$tournament_data || !$roster_data) {
            wp_die('Error fetching data');
        }
        
        $photo_map = [];
        $debug_photos = [];
        
        foreach ($roster_data as $entry) {
            $member = $entry['member'];
            $card_id = isset($member['member_card_id']) ? number_format($member['member_card_id'], 0, '', '') : null;
            
            // Check multiple possible photo locations
            $photo = null;
            if (isset($member['custom_fields']['photo'])) {
                $photo = $member['custom_fields']['photo'];
            } elseif (isset($member['photo'])) {
                $photo = $member['photo'];
            } elseif (isset($member['photo_url'])) {
                $photo = $member['photo_url'];
            }
            
            $debug_photos[] = [
                'card_id' => $card_id,
                'name' => $member['name'] ?? 'Unknown',
                'photo' => $photo,
                'custom_fields' => $member['custom_fields'] ?? null,
                'has_photo_field' => isset($member['custom_fields']['photo']),
                'photo_valid' => $photo ? filter_var($photo, FILTER_VALIDATE_URL) : false
            ];
            
            if ($card_id && $photo && filter_var($photo, FILTER_VALIDATE_URL)) {
                $photo_map[strval($card_id)] = $photo;
            }
        }
        
        $processed_results = [];
        foreach ($tournament_data['event']['scopes'][0]['aggregates'] as $player) {
            $member_card_id = number_format($player['member_cards'][0]['member_card_id'], 0, '', '');
            $processed_results[] = [
                'member_card_id' => $member_card_id,
                'position' => $player['position'],
                'name' => $player['name'],
                'total' => $player['total'],
                'score' => $player['score'],
                'rounds' => $player['rounds'],
                'has_photo' => isset($photo_map[$member_card_id]),
                'photo_url' => $photo_map[$member_card_id] ?? null
            ];
        }
        
        wp_send_json([
            'results' => $processed_results,
            'roster' => $photo_map,
            'debug' => [
                'total_roster_entries' => count($roster_data),
                'photos_found' => count($photo_map),
                'tournament_players' => count($processed_results),
                'photo_debug' => array_slice($debug_photos, 0, 5), // First 5 entries for debugging
                'roster_sample' => isset($roster_data[0]) ? $roster_data[0] : null
            ]
        ]);
    }
    
    private function get_json($url) {
        $response = wp_remote_get($url, [
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 30
        ]);
        
        if (is_wp_error($response)) {
            return null;
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
    
    public function shortcode_display($atts) {
        $atts = shortcode_atts([], $atts, 'golf_leaderboard');
        
        ob_start();
        ?>
        <div class="golf-leaderboard-container">
            <div id="golf-loader" class="golf-loader"></div>
            <div id="golf-leaderboard-list" class="golf-leaderboard-list"></div>
        </div>
        <?php
        return ob_get_clean();
    }
}

// Initialize the plugin
new GolfLeaderboardPlugin();
?>
