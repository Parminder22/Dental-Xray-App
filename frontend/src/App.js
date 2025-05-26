import React, { useState, useEffect } from "react";

function Spinner() {
  return (
    <svg
      className="animate-spin h-6 w-6 text-white mx-auto"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading spinner"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState(null);
  const [report, setReport] = useState("");
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const backendUrl = "http://127.0.0.1:8000";

  // Reset imageLoaded flag when URLs change
  useEffect(() => {
    setImageLoaded(false);
  }, [originalImageUrl, annotatedImageUrl]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a DICOM file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport("");
    setOriginalImageUrl(null);
    setAnnotatedImageUrl(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${backendUrl}/upload/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data = await res.json();

      setOriginalImageUrl(`${backendUrl}${data.original_image_url}`);
      setAnnotatedImageUrl(`${backendUrl}${data.annotated_image_url}`);
      setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8 md:p-12 flex flex-col md:flex-row gap-12 max-w-7xl mx-auto">
      {/* Left Panel */}
      <section className="flex-1 bg-white rounded-lg shadow-lg p-8 flex flex-col">
        <h1 className="text-3xl font-extrabold text-blue-700 mb-6 text-center md:text-left">
          Dental X-ray Analyzer
        </h1>

        <label
          htmlFor="fileUpload"
          className="block mb-2 font-semibold text-gray-700 cursor-pointer"
        >
          Select Dental X-ray File (DICOM)
        </label>
        <input
          id="fileUpload"
          type="file"
          accept=".dcm,.rvg"
          onChange={handleFileChange}
          className="mb-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white file:font-semibold hover:file:bg-blue-700 transition-colors"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full py-3 rounded-md text-white font-semibold tracking-wide shadow-md transition-colors ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } flex justify-center items-center gap-2`}
          aria-live="polite"
        >
          {loading && <Spinner />}
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {error && (
          <p
            role="alert"
            className="mt-4 text-center text-red-600 font-medium bg-red-100 p-2 rounded"
          >
            {error}
          </p>
        )}

        {/* Images */}
        <div className="mt-8 space-y-10 flex-grow overflow-auto">
          {originalImageUrl && (
            <div>
              <h2 className="text-xl font-semibold mb-2 text-center text-blue-800">
                Original Image
              </h2>
              <img
                src={originalImageUrl}
                alt="Original Dental X-ray"
                className={`mx-auto max-w-full max-h-[400px] rounded-lg border border-gray-300 shadow-md transition-opacity duration-700 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            </div>
          )}
          {annotatedImageUrl && (
            <div>
              <h2 className="text-xl font-semibold mb-2 text-center text-blue-800">
                Annotated Image
              </h2>
              <img
                src={annotatedImageUrl}
                alt="Annotated Dental X-ray"
                className={`mx-auto max-w-full max-h-[400px] rounded-lg border border-gray-300 shadow-md transition-opacity duration-700 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            </div>
          )}
        </div>
      </section>

      {/* Right Panel */}
      <aside className="flex-1 bg-white rounded-lg shadow-lg p-8 flex flex-col">
        <h2 className="text-3xl font-extrabold text-blue-700 mb-6 text-center md:text-left">
          Diagnostic Report
        </h2>

        <div
          aria-live="polite"
          className="flex-grow whitespace-pre-wrap bg-gray-50 p-6 rounded-md border border-gray-300 shadow-inner overflow-y-auto min-h-[250px] text-gray-800 text-sm font-mono"
        >
          {loading && !report && (
            <p className="text-center text-blue-600 italic">Generating report...</p>
          )}
          {!loading && !report && !error && (
            <p className="text-center text-gray-400 italic">No report available yet.</p>
          )}
          {error && (
            <p className="text-center text-red-600 font-semibold">{error}</p>
          )}
          {report && !error && <pre>{report}</pre>}
        </div>
      </aside>
    </div>
  );
}

export default App;
