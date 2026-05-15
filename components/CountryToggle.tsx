"use client";

import { useRouter } from "next/navigation";

export default function CountryToggle({
  region,
  activeDate,
}: {
  region: "india" | "global";
  activeDate: string;
}) {
  const router = useRouter();
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  function navigate(r: "india" | "global") {
    const params = new URLSearchParams();
    if (activeDate !== todayIST) params.set("date", activeDate);
    if (r === "global") params.set("region", "global");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="inline-flex items-center bg-white border border-gray-200 rounded-full p-0.5 shadow-sm">
      <button
        onClick={() => navigate("india")}
        className={`px-5 py-2 rounded-full text-[15px] sm:text-[14px] font-bold transition-all duration-150 ${
          region === "india"
            ? "bg-gray-900 text-white shadow-sm"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        🇮🇳 India
      </button>
      <button
        onClick={() => navigate("global")}
        className={`px-5 py-2 rounded-full text-[15px] sm:text-[14px] font-bold transition-all duration-150 ${
          region === "global"
            ? "bg-gray-900 text-white shadow-sm"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        🌍 Global
      </button>
    </div>
  );
}
