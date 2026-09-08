<?php

namespace App\Console\Commands;

use App\Models\MediaFile;
use App\Models\WebsiteMediaSlot;
use Illuminate\Console\Command;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportWebsiteMedia extends Command
{
    protected $signature = 'legendary:import-website-media
        {--frontend-public= : Absolute path to frontend/public}
        {--frontend-url= : Public frontend URL to import from when frontend/public is unavailable}';

    protected $description = 'Import known public website content images into MediaFile and WebsiteMediaSlot.';

    private const SLOTS = [
        'home_hero_hotel' => ['Home Hero Hotel', '/hotel.png'],
        'home_hero_meeting' => ['Home Hero Meeting', '/meeting.png'],
        'home_hero_travel' => ['Home Hero Travel', '/travel.png'],
        'home_real_requests' => ['Home Real Requests', '/real%20requests.png'],
        'home_why_legendary' => ['Home Why Legendary', '/why-legendary.jpg'],
        'home_coordination_1' => ['Home Coordination 1', '/coordination01.png'],
        'home_coordination_2' => ['Home Coordination 2', '/coordination02.png'],
        'home_coordination_3' => ['Home Coordination 3', '/coordination03.png'],
        'home_coordination_4' => ['Home Coordination 4', '/coordination04.png'],
        'home_coordination_5' => ['Home Coordination 5', '/coordination05.png'],
        'home_request_journey_1' => ['Home Request Journey 1', '/request/Share-the-trip.jpg'],
        'home_request_journey_2' => ['Home Request Journey 2', '/request/Review-the-requirements.jpg'],
        'home_request_journey_3' => ['Home Request Journey 3', '/request/Coordinate-the-options.jpg'],
        'home_request_journey_4' => ['Home Request Journey 4', '/request/Confirm-the-booking.jpg'],
        'home_request_journey_5' => ['Home Request Journey 5', '/request/Keep-details-organized.jpg'],
        'hero_marquee_b2b_travel_solutions' => ['Home Hero Marquee B2B Travel Solutions', '/hero-marquee/B2B-Travel-Solutions.jpg'],
        'hero_marquee_flight_arrangements' => ['Home Hero Marquee Flight Arrangements', '/hero-marquee/Flight-Arrangements.jpg'],
        'hero_marquee_hotels_accommodation' => ['Home Hero Marquee Hotels Accommodation', '/hero-marquee/Hotels-Accommodation.jpg'],
        'hero_marquee_booking_desk' => ['Home Hero Marquee Booking Desk', '/hero-marquee/Booking-Desk.jpg'],
        'hero_marquee_group_travel' => ['Home Hero Marquee Group Travel', '/hero-marquee/Group-Travel.jpg'],
        'hero_marquee_middle_east_africa' => ['Home Hero Marquee Middle East Africa', '/hero-marquee/Middle-East-Africa.jpg'],
        'hero_marquee_customers_agents' => ['Home Hero Marquee Customers Agents', '/hero-marquee/Customers-Agents.jpg'],
        'hero_marquee_suppliers_pricing' => ['Home Hero Marquee Suppliers Pricing', '/hero-marquee/Suppliers-Pricing.jpg'],
        'hero_marquee_taxidia' => ['Home Hero Marquee Taxidia', '/hero-marquee/Taxidia.jpg'],
        'hero_marquee_hospitality' => ['Home Hero Marquee Hospitality', '/hero-marquee/Hospitality.jpg'],
        'hero_marquee_become_partner' => ['Home Hero Marquee Become Partner', '/hero-marquee/Become-a-Partner.jpg'],
        'hero_marquee_reports_control' => ['Home Hero Marquee Reports Control', '/hero-marquee/Reports-Control.jpg'],
        'about_hero' => ['About Hero', '/hotel.png'],
        'about_identity' => ['About Identity', '/real%20requests.png'],
        'partners_hero' => ['Partners Hero', '/meeting.png'],
        'partners_network_mafairjets' => ['Partners Network MA Fairjets', '/partnership/mafairjets.jpg'],
        'partners_network_tarteeb' => ['Partners Network Tarteeb', '/partnership/tarteeb.jpg'],
        'partners_network_taxidia' => ['Partners Network Taxidia', '/partnership/taxidia.jpg'],
        'partners_models' => ['Partners Models', '/real%20requests.png'],
        'partners_scenarios' => ['Partners Scenarios', '/taxidia02.png'],
        'solutions_hotels_accommodation' => ['Website — Hotels & Accommodation', '/solutions/Hotels-Accommodation.jpg'],
        'solutions_flights' => ['Website — Flights', '/solutions/Flights.jpg'],
        'solutions_transfers' => ['Website — Transfers', '/solutions/Transfers.jpg'],
        'solutions_car_rental' => ['Website — Car Rental', '/solutions/Car-Rental.jpg'],
        'solutions_tours_experiences' => ['Website — Tours & Experiences', '/solutions/Tours-Experiences.jpg'],
        'solutions_groups' => ['Website — Groups', '/solutions/Groups.jpg'],
        'solutions_corporate_travel' => ['Website — Corporate Travel', '/solutions/Corporate-Travel.jpg'],
        'solutions_hospitality' => ['Website — Hospitality', '/solutions/Hospitality.jpg'],
        'platform_story' => ['Platform Request Journey', '/request-journey.png'],
        'platform_records' => ['Platform Connected Records', '/connected-records.png'],
        'platform_audience' => ['Platform Corporate Travel Audience', '/solutions/Corporate-Travel.jpg'],
        'platform_taxidia_01' => ['Platform Taxidia Screen 01', '/taxidia01.png'],
        'platform_taxidia_02' => ['Platform Taxidia Screen 02', '/taxidia02.png'],
        'platform_taxidia_03' => ['Platform Taxidia Screen 03', '/taxidia03.png'],
        'platform_taxidia_04' => ['Platform Taxidia Screen 04', '/taxidia04.png'],
        'platform_taxidia_05' => ['Platform Taxidia Screen 05', '/taxidia05.png'],
        'platform_taxidia_06' => ['Platform Taxidia Screen 06', '/taxidia06.png'],
        'platform_logo_mark' => ['Platform Taxidia Mark', '/taxidiaplatform.png'],
        'accommodation_city_hotels' => ['Accommodation City Hotels', '/hotel.png'],
        'accommodation_resorts' => ['Accommodation Resorts', '/travel.png'],
        'accommodation_apartments' => ['Accommodation Apartments', '/meeting.png'],
        'accommodation_groups' => ['Accommodation Groups', '/hotel.png'],
    ];

    public function handle(): int
    {
        $publicPath = $this->option('frontend-public') ?: base_path('../frontend/public');
        $publicPath = rtrim(str_replace('\\', '/', $publicPath), '/');
        $frontendUrl = $this->frontendUrl();

        foreach (self::SLOTS as $key => [$label, $fallbackPath]) {
            $slot = WebsiteMediaSlot::query()->firstOrCreate(
                ['key' => $key],
                ['label' => $label, 'fallback_path' => $fallbackPath]
            );

            $slot->fill(['label' => $label, 'fallback_path' => $fallbackPath]);

            if (!$this->slotHasExistingFile($slot)) {
                $absolute = $publicPath . '/' . ltrim(rawurldecode($fallbackPath), '/');
                if (is_file($absolute)) {
                    $slot->media_file_id = $this->importImage($absolute, $fallbackPath)->id;
                } elseif ($frontendUrl) {
                    $remotePath = $this->downloadRemoteImage($frontendUrl, $fallbackPath);
                    if ($remotePath) {
                        $slot->media_file_id = $this->importImage($remotePath, $fallbackPath)->id;
                        @unlink($remotePath);
                    } else {
                        $this->warn("Missing source image for {$key}: {$absolute}");
                    }
                } else {
                    $this->warn("Missing source image for {$key}: {$absolute}");
                }
            }

            $slot->save();
            $this->line("Website media slot ready: {$key}");
        }

        return self::SUCCESS;
    }

    private function slotHasExistingFile(WebsiteMediaSlot $slot): bool
    {
        if (!$slot->media_file_id) {
            return false;
        }

        $mediaFile = $slot->mediaFile;
        if (!$mediaFile) {
            return false;
        }

        return Storage::disk($mediaFile->disk)->exists($mediaFile->path);
    }

    private function frontendUrl(): ?string
    {
        $url = $this->option('frontend-url') ?: config('app.frontend_url');
        if (!is_string($url) || trim($url) === '') {
            return null;
        }

        $url = rtrim(trim($url), '/');
        $host = parse_url($url, PHP_URL_HOST);
        if (is_string($host) && Str::startsWith($host, 'api.')) {
            $scheme = parse_url($url, PHP_URL_SCHEME) ?: 'https';
            $port = parse_url($url, PHP_URL_PORT);
            $url = $scheme . '://' . substr($host, 4) . ($port ? ':' . $port : '');
        }

        return $url;
    }

    private function downloadRemoteImage(string $frontendUrl, string $fallbackPath): ?string
    {
        $url = $frontendUrl . '/' . ltrim($fallbackPath, '/');
        $contents = $this->fetchRemoteContents($url);
        if ($contents === null) {
            return null;
        }

        $extension = strtolower(pathinfo(parse_url($url, PHP_URL_PATH) ?: '', PATHINFO_EXTENSION)) ?: 'img';
        $directory = storage_path('app/tmp/website-media-import');
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $path = $directory . DIRECTORY_SEPARATOR . Str::random(32) . '.' . $extension;
        file_put_contents($path, $contents);

        return @getimagesize($path) ? $path : tap(null, fn () => @unlink($path));
    }

    private function fetchRemoteContents(string $url): ?string
    {
        $context = stream_context_create([
            'http' => [
                'timeout' => 20,
                'header' => "User-Agent: LegendaryMediaImporter/1.0\r\n",
            ],
        ]);
        $contents = @file_get_contents($url, false, $context);
        if (is_string($contents) && $contents !== '') {
            return $contents;
        }

        if (!function_exists('curl_init')) {
            return null;
        }

        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_USERAGENT => 'LegendaryMediaImporter/1.0',
        ]);
        $response = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);

        return is_string($response) && $response !== '' && $status >= 200 && $status < 300
            ? $response
            : null;
    }

    private function importImage(string $absolutePath, string $fallbackPath): MediaFile
    {
        $file = new File($absolutePath);
        $imageInfo = @getimagesize($absolutePath) ?: null;
        $mime = is_array($imageInfo) ? ($imageInfo['mime'] ?? $file->getMimeType()) : $file->getMimeType();
        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION)) ?: $file->extension();
        $safeName = Str::random(40) . '.' . $extension;
        $path = Storage::disk('public')->putFileAs('media/website', $file, $safeName);

        return MediaFile::query()->create([
            'reference' => MediaFile::generateReference(),
            'type' => 'image',
            'filename' => basename($path),
            'original_filename' => basename(rawurldecode($fallbackPath)),
            'mime_type' => $mime,
            'size' => filesize($absolutePath),
            'width' => is_array($imageInfo) ? $imageInfo[0] : null,
            'height' => is_array($imageInfo) ? $imageInfo[1] : null,
            'path' => $path,
            'disk' => 'public',
            'collection_name' => 'website',
            'uploaded_by' => null,
        ]);
    }
}
