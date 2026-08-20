"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";

import { useContent, useLocale } from "@/components/i18n";

const serviceHrefs = [
  "/solutions/hotels-accommodation",
  "/solutions/flights",
  "/solutions/transfers",
  "/solutions/car-rental",
  "/solutions/tours-experiences",
  "/solutions/groups-special-requests",
  "/solutions/corporate-travel",
  "/solutions/hospitality-solutions",
] as const;

const serviceImages = [
  "/solutions/Hotels-Accommodation.jpg",
  "/solutions/Flights.jpg",
  "/solutions/Transfers.jpg",
  "/solutions/Car-Rental.jpg",
  "/solutions/Tours-Experiences.jpg",
  "/solutions/Groups.jpg",
  "/solutions/Corporate-Travel.jpg",
  "/solutions/Hospitality.jpg",
] as const;

const oldApprovedServices = [
  ["Hotels & Accommodation", "Accommodation for individual, group and corporate travel."],
  ["Flights", "Flight reservations and itinerary coordination for individual, group and business travel."],
  ["Transfers", "Airport transfers and ground transport between hotels, venues and other locations."],
  ["Car Rental", "Vehicle rental options for individual and business travel."],
  ["Tours & Experiences", "Tours, activities and destination experiences for individual and group itineraries."],
  ["Groups", "Travel arrangements for groups, including accommodation, transport and related services."],
  ["Corporate Travel", "Travel arrangements for companies, employees and business travellers."],
  ["Hospitality", "Travel and operational services for hotels and hospitality businesses."],
] as const;

const oldApprovedDescription =
  "Accommodation, air travel, transfers, mobility, tours and group services arranged around the requirements of each trip.";

export function HomepageServices() {
  const c = useContent();
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const services = isAr ? c.services : oldApprovedServices;

  return (
    <section id="solutions" className="homepage-services section-shell" dir={isAr ? "rtl" : "ltr"}>
      <div className="homepage-services-header">
        <div>
          <div className="section-kicker">02 / {c.nav.services}</div>
          <h2>
            <span>{isAr ? "خدمات" : "Travel"}</span>{" "}
            <em>{isAr ? "السفر" : "made practical"}</em>
          </h2>
        </div>
        <p>{isAr ? c.servicesBody : oldApprovedDescription}</p>
      </div>

      <div className="homepage-services-grid">
        {services.map(([title, description], index) => (
          <article className="homepage-service-card" key={title}>
            <span className="homepage-service-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="homepage-service-copy">
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <div className="homepage-service-image">
              <Image
                src={serviceImages[index]}
                alt=""
                fill
                sizes="(max-width: 700px) calc(100vw - 72px), (max-width: 1100px) 45vw, 23vw"
                unoptimized
              />
            </div>
            <Link className="homepage-service-link" href={serviceHrefs[index]} aria-label={title}>
              {isAr ? <ArrowUpLeft size={18} /> : <ArrowUpRight size={18} />}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
