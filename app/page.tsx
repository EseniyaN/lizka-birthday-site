"use client";

import dynamic from "next/dynamic";

const BirthdayExperience = dynamic(
  () => import("@/components/birthday-experience"),
  {
    ssr: false,
    loading: () => (
      <main className="loading-screen" aria-live="polite">
        <div className="loading-orbit" aria-hidden="true" />
        <p>Зажигаем свечи…</p>
      </main>
    ),
  },
);

export default function Home() {
  return <BirthdayExperience />;
}
