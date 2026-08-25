import DownloadsContent from "@/components/DownloadsContent";
import React, { Suspense } from "react";

const DownloadsPage = () => {
  return (
    <main className="flex-1 p-6 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Downloads</h1>
        <Suspense fallback={<div>Loading downloads...</div>}>
          <DownloadsContent />
        </Suspense>
      </div>
    </main>
  );
};

export default DownloadsPage;
