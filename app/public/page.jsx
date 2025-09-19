"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import NewSubmission from "./components/NewSubmission";
import StatusCheck from "./components/StatusCheck";

export default function PublicPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("submission");

  useEffect(() => {
    // Handle tab parameter from URL
    const tabParam = searchParams.get("tab");
    if (tabParam === "status" || tabParam === "submission") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
    {/* Logo Kabupaten Bogor */}
    <img
      src="/images/logo-bogor.png"
      alt="Logo Kabupaten Bogor"
      className="w-12 h-auto"
    />
    {/* Teks */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Layanan Masyarakat
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Pengajuan dan Pengecekan Status Layanan Kecamatan Gunung Putri
              </p>
            </div>
            </div>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base flex items-center justify-center sm:justify-start"
            >
              <svg
                className="w-4 h-4 mr-1 sm:mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
            <button
  onClick={() => setActiveTab("submission")}
  className={`flex items-center gap-2 py-3 sm:py-4 px-4 sm:px-6 font-medium text-xs sm:text-sm border-b-2 transition-colors flex-1 sm:flex-none ${
    activeTab === "submission"
      ? "border-blue-500 text-blue-600"
      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
  }`}
>
<i className="fas fa-file"></i>


                 Pengajuan Baru
              </button>
              <button
                onClick={() => setActiveTab("status")}
                className={`flex items-center gap-2 py-3 sm:py-4 px-4 sm:px-6 font-medium text-xs sm:text-sm border-b-2 transition-colors flex-1 sm:flex-none ${
                  activeTab === "status"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="fas fa-clipboard-check"></i>
                Cek Status
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          {activeTab === "submission" ? <NewSubmission /> : <StatusCheck />}
        </div>
      </div>
    </div>
  );
}
