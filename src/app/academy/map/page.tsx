import type { Metadata } from "next";
import { MapScreen } from "@/features/map/map-screen";

export const metadata: Metadata = { title: "Mission Map" };

export default function MapPage() {
  return <MapScreen />;
}
