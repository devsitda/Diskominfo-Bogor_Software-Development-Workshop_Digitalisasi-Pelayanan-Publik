"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Table, 
  Select, 
  message, 
  Card, 
  Row, 
  Col, 
  Input, 
  Button, 
  Space, 
  Dropdown, 
  Checkbox,
  Tooltip as AntTooltip
} from "antd";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { 
  SearchOutlined, 
  FilterOutlined, 
  DownloadOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined,
  ReloadOutlined,
  ClearOutlined
} from "@ant-design/icons";

const { Option } = Select;
const { Search } = Input;

export default function AdminDashboard() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [chartData, setChartData] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState({}); // Track which submission is being updated
  const [refreshing, setRefreshing] = useState(false); // Track refresh loading state
  
  // Enhanced filtering and search states
  const [searchText, setSearchText] = useState("");
  const [filteredInfo, setFilteredInfo] = useState({});
  const [sortedInfo, setSortedInfo] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({
    tracking_code: true,
    nama: true,
    jenis_layanan: true,
    status: true,
    created_at: true,
    updated_at: true,
  });

  const COLORS = ["#ffc107", "#1890ff", "#52c41a", "#ff4d4f"];
  const SERVICE_COLORS = ["#198754", "#0d6efd", "#6f42c1", "#fd7e14", "#20c997", "#dc3545", "#6610f2", "#198754"];

  // Compute summary per jenis_layanan
  const getServiceSummary = (items) => {
    const normalize = (s) => (s || "").toString().trim().toUpperCase().replace(/\s+/g, " ");
    const buckets = {
      SURAT_KETERANGAN: ["SURAT_KETERANGAN", "SURAT KETERANGAN"],
      KTP: ["KTP"],
      KK: ["KK"],
      AKTE_LAHIR: ["AKTE LAHIR", "AKTE_LAHIR", "AKTA LAHIR"],
      SURAT_PINDAH: ["SURAT PINDAH", "SURAT_PINDAH"],
      SKCK: ["SKCK"],
    };
    const counts = {
      SURAT_KETERANGAN: 0,
      KTP: 0,
      KK: 0,
      AKTE_LAHIR: 0,
      SURAT_PINDAH: 0,
      SKCK: 0,
    };

    for (const it of items || []) {
      const jl = normalize(it.jenis_layanan);
      for (const key of Object.keys(buckets)) {
        if (buckets[key].some((v) => jl === v)) {
          counts[key] += 1;
          break;
        }
      }
    }
    return counts;
  };

  useEffect(() => {
    // Check if admin is logged in
    const checkAuth = () => {
      const isLoggedIn = localStorage.getItem("adminLoggedIn");
      console.log("Auth check - isLoggedIn:", isLoggedIn); // Debug log
      if (!isLoggedIn) {
        console.log("Not logged in, redirecting to login"); // Debug log
        router.push("/admin/login");
        return;
      }
      console.log("Logged in, fetching submissions"); // Debug log
      fetchSubmissions();
    };

    // Add a small delay to ensure localStorage is available
    setTimeout(checkAuth, 100);
  }, [router]);

  const fetchSubmissions = async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    }

    try {
      // Ultra-aggressive cache bypass
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const forceRefresh = Date.now();
      const cacheBuster = Math.random().toString(36).substring(7);

      const response = await fetch(
        `/api/admin/submissions?t=${timestamp}&r=${random}&force=${forceRefresh}&cb=${cacheBuster}&_=${Date.now()}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            Pragma: "no-cache",
            "X-Requested-With": "XMLHttpRequest",
            "X-Force-Refresh": "true",
            "X-Cache-Buster": `${timestamp}-${random}`,
            "X-Request-Time": `${Date.now()}`,
          },
          // Force fresh request
          cache: "no-store",
        }
      );
      const data = await response.json();

      if (response.ok) {
        setSubmissions(data);
        updateChartData(data);
        if (showLoading) {
          message.success("Data berhasil diperbarui");
        }
      } else {
        message.error("Gagal memuat data pengajuan");
      }
    } catch (error) {
      message.error("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
      if (showLoading) {
        setRefreshing(false);
      }
    }
  };

  // Simple refresh function
  const handleRefresh = () => {
    fetchSubmissions(true);
  };

  const updateChartData = (data) => {
    const statusCount = data.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(statusCount).map(([status, count]) => ({
      name: getStatusText(status),
      value: count,
      status,
    }));

    setChartData(chartData);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "PENGAJUAN_BARU":
        return "Pengajuan Baru";
      case "DIPROSES":
        return "Sedang Diproses";
      case "SELESAI":
        return "Selesai";
      case "DITOLAK":
        return "Ditolak";
      default:
        return status;
    }
  };

  const handleStatusChange = async (submissionId, newStatus) => {
    // Set loading state for this specific submission
    setUpdatingStatus((prev) => ({ ...prev, [submissionId]: true }));

    try {
      // Prevent invalid local transitions for better UX (server also guards)
      const current = submissions.find((s) => s.id === submissionId)?.status;
      const rank = { PENGAJUAN_BARU: 1, DIPROSES: 2, SELESAI: 3, DITOLAK: 3 };
      if ((current === "SELESAI" || current === "DITOLAK") && newStatus !== current) {
        message.warning("Status final tidak dapat diubah");
        setUpdatingStatus((prev) => ({ ...prev, [submissionId]: false }));
        return;
      }
      if (rank[newStatus] < rank[current]) {
        message.warning("Status tidak dapat mundur");
        setUpdatingStatus((prev) => ({ ...prev, [submissionId]: false }));
        return;
      }

      const response = await fetch(
        `/api/admin/submissions/${submissionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        message.success("Status berhasil diupdate");
        // Extended loading state untuk memastikan data ter-update
        // Keep loading for 2.5 seconds to ensure data is fresh
        setTimeout(() => {
          // Force refresh dengan cache bypass yang lebih agresif
          const forceTimestamp = Date.now();
          const forceRandom = Math.random().toString(36).substring(7);
          const forceCacheBuster = Math.random().toString(36).substring(7);

          // Multiple refresh attempts dengan delay yang lebih lama
          fetchSubmissions(true);

          // Additional force refresh after 1.5 seconds
          setTimeout(() => {
            fetch(
              `/api/admin/submissions?force=${forceTimestamp}&r=${forceRandom}&cb=${forceCacheBuster}&_=${Date.now()}`,
              {
                headers: {
                  "Cache-Control":
                    "no-cache, no-store, must-revalidate, max-age=0",
                  "X-Force-Refresh": "true",
                  "X-Cache-Buster": `${forceTimestamp}-${forceRandom}`,
                },
                cache: "no-store",
              }
            ).then(() => {
              // Final refresh
              fetchSubmissions(true);
            });
          }, 1500); // Increased delay to 1.5 seconds
        }, 1000); // Increased initial delay to 1 second
      } else {
        const error = await response.json();
        message.error(error.message || "Gagal mengupdate status");
      }
    } catch (error) {
      message.error("Terjadi kesalahan jaringan");
    } finally {
      // Clear loading state after extended delay to ensure data is fresh
      setTimeout(() => {
        setUpdatingStatus((prev) => ({ ...prev, [submissionId]: false }));
      }, 2500); // Total loading time: 2.5 seconds
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    router.push("/admin/login");
  };

  // Enhanced search and filter functions
  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setFilteredInfo(filters);
    setSortedInfo(sorter);
  };

  const clearFilters = () => {
    setFilteredInfo({});
    setSortedInfo({});
    setSearchText("");
    setStatusFilter("ALL");
  };

  const handleColumnVisibilityChange = (columnKey, checked) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: checked
    }));
  };

  const exportToCSV = () => {
    const headers = ['Kode Tracking', 'Nama', 'Jenis Layanan', 'Status', 'Dibuat', 'Diupdate'];
    const csvContent = [
      headers.join(','),
      ...filteredSubmissions.map(submission => [
        submission.tracking_code,
        `"${submission.nama}"`,
        `"${submission.jenis_layanan}"`,
        getStatusText(submission.status),
        submission.created_at ? new Date(submission.created_at).toLocaleString('id-ID') : '',
        submission.updated_at ? new Date(submission.updated_at).toLocaleString('id-ID') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pengajuan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      title: "Kode Tracking",
      dataIndex: "tracking_code",
      key: "tracking_code",
      sorter: (a, b) => a.tracking_code.localeCompare(b.tracking_code),
      sortOrder: sortedInfo.columnKey === 'tracking_code' && sortedInfo.order,
      filteredValue: filteredInfo.tracking_code || null,
      onFilter: (value, record) => record.tracking_code.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Cari kode tracking"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Cari
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Reset
            </Button>
          </Space>
        </div>
      ),
      render: (text) => (
        <div className="max-w-[120px] sm:max-w-[200px] lg:max-w-[300px]">
          <span
            className="font-mono text-xs sm:text-sm break-all leading-tight"
            title={text}
          >
            {text}
          </span>
        </div>
      ),
      width: 200,
      fixed: "left",
    },
    {
      title: "Nama",
      dataIndex: "nama",
      key: "nama",
      sorter: (a, b) => a.nama.localeCompare(b.nama),
      sortOrder: sortedInfo.columnKey === 'nama' && sortedInfo.order,
      filteredValue: filteredInfo.nama || null,
      onFilter: (value, record) => record.nama.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Cari nama"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Cari
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Reset
            </Button>
          </Space>
        </div>
      ),
      width: 120,
      render: (text) => (
        <div className="max-w-[80px] sm:max-w-[120px]">
          <span
            className="text-xs sm:text-sm break-words leading-tight"
            title={text}
          >
            {text}
          </span>
        </div>
      ),
    },
    {
      title: "Jenis Layanan",
      dataIndex: "jenis_layanan",
      key: "jenis_layanan",
      sorter: (a, b) => a.jenis_layanan.localeCompare(b.jenis_layanan),
      sortOrder: sortedInfo.columnKey === 'jenis_layanan' && sortedInfo.order,
      filteredValue: filteredInfo.jenis_layanan || null,
      onFilter: (value, record) => record.jenis_layanan.toLowerCase().includes(value.toLowerCase()),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Cari jenis layanan"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Cari
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Reset
            </Button>
          </Space>
        </div>
      ),
      width: 120,
      render: (text) => (
        <div className="max-w-[80px] sm:max-w-[120px]">
          <span
            className="text-xs sm:text-sm break-words leading-tight"
            title={text}
          >
            {text}
          </span>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      sorter: (a, b) => a.status.localeCompare(b.status),
      sortOrder: sortedInfo.columnKey === 'status' && sortedInfo.order,
      filters: [
        { text: 'Pengajuan Baru', value: 'PENGAJUAN_BARU' },
        { text: 'Sedang Diproses', value: 'DIPROSES' },
        { text: 'Selesai', value: 'SELESAI' },
        { text: 'Ditolak', value: 'DITOLAK' },
      ],
      filteredValue: filteredInfo.status || null,
      onFilter: (value, record) => record.status === value,
      width: 180,
      render: (status, record) => (
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
          <Select
            value={status}
            style={{ width: "100%", minWidth: "100px", maxWidth: "150px" }}
            onChange={(value) => handleStatusChange(record.id, value)}
            disabled={updatingStatus[record.id]}
            loading={updatingStatus[record.id]}
            size="small"
          >
            <Option value="PENGAJUAN_BARU">Pengajuan Baru</Option>
            <Option value="DIPROSES">Sedang Diproses</Option>
            <Option value="SELESAI">Selesai</Option>
            <Option value="DITOLAK">Ditolak</Option>
          </Select>
          {updatingStatus[record.id] && (
            <div className="flex items-center text-blue-600 text-xs sm:text-sm">
              <svg
                className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-1"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="hidden sm:inline">Updating...</span>
              <span className="sm:hidden">...</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Dibuat",
      dataIndex: "created_at",
      key: "created_at",
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      sortOrder: sortedInfo.columnKey === 'created_at' && sortedInfo.order,
      width: 150,
      responsive: ["lg"],
      render: (date) => {
        if (!date) return "-";
        try {
          const formattedDate = new Date(date).toLocaleString("id-ID", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div className="max-w-[100px] sm:max-w-[150px]">
              <span
                className="text-xs sm:text-sm break-words leading-tight"
                title={formattedDate}
              >
                {formattedDate}
              </span>
            </div>
          );
        } catch (error) {
          return "-";
        }
      },
    },
    {
      title: "Diupdate",
      dataIndex: "updated_at",
      key: "updated_at",
      sorter: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
      sortOrder: sortedInfo.columnKey === 'updated_at' && sortedInfo.order,
      width: 150,
      responsive: ["lg"],
      render: (date) => {
        if (!date) return "-";
        try {
          const formattedDate = new Date(date).toLocaleString("id-ID", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div className="max-w-[100px] sm:max-w-[150px]">
              <span
                className="text-xs sm:text-sm break-words leading-tight"
                title={formattedDate}
              >
                {formattedDate}
              </span>
            </div>
          );
        } catch (error) {
          return "-";
        }
      },
    },
  ];

  // Enhanced filtering logic with global search
  const filteredSubmissions = submissions.filter((submission) => {
    // Status filter
    const statusMatch = statusFilter === "ALL" || submission.status === statusFilter;
    
    // Global search filter
    const searchMatch = !searchText || 
      submission.tracking_code.toLowerCase().includes(searchText.toLowerCase()) ||
      submission.nama.toLowerCase().includes(searchText.toLowerCase()) ||
      submission.jenis_layanan.toLowerCase().includes(searchText.toLowerCase()) ||
      getStatusText(submission.status).toLowerCase().includes(searchText.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-start space-x-4">
  {/* Logo Kabupaten Bogor */}
  <img
    src="/images/logo-bogor.png" // Ganti dengan path logo kamu
    alt="Logo Kabupaten Bogor"
    className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
  />

  {/* Judul dan Deskripsi */}
  <div>
    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
      Admin Dashboard PATEN
    </h1>
    <p className="text-sm sm:text-base text-gray-600 mt-1">
      {loading
        ? "Memuat data pengajuan..."
        : "Kelola pengajuan layanan masyarakat Gunung Putri"}
    </p>
  </div>
</div>






            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center text-sm sm:text-base mr-2"
              >
                {refreshing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Refreshing...
                  </>
                ) : loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  "Refresh"
                )}
              </button>

              {/* Force Refresh Button - Hidden for production */}
              {/* <button
                 onClick={() => {
                   // Force hard refresh
                   window.location.reload();
                 }}
                 disabled={refreshing || loading}
                 className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center text-sm sm:text-base mr-2"
                 title="Force hard refresh untuk bypass semua cache"
               >
                 <svg
                   className="w-4 h-4 mr-1"
                   fill="none"
                   stroke="currentColor"
                   viewBox="0 0 24 24"
                 >
                   <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                   />
                 </svg>
                 Force Refresh
               </button> */}

              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Debug Info - Hidden for production */}
        {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
           <div className="flex items-center">
             <svg
               className="w-5 h-5 text-yellow-600 mr-2"
               fill="none"
               stroke="currentColor"
               viewBox="0 0 24 24"
             >
               <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={2}
                 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
               />
             </svg>
             <div className="text-sm text-yellow-800">
               <strong>Cache Bypass Active:</strong> Data akan auto-refresh
               setelah status update. Loading state extended untuk memastikan
               data fresh.
             </div>
           </div>
         </div> */}

        {/* Stats Cards */}
        <Row gutter={[8, 8]} className="mb-6 sm:mb-8">
          <Col xs={12} sm={6}>
            <Card>
              <div className="text-center">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">
                    {submissions.length}
                  </div>
                )}
                <div className="text-sm sm:text-base text-gray-600">
                  Total Pengajuan
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <div className="text-center">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-yellow-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                    {
                      submissions.filter((s) => s.status === "PENGAJUAN_BARU")
                        .length
                    }
                  </div>
                )}
                <div className="text-sm sm:text-base text-gray-600">
                  Pengajuan Baru
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <div className="text-center">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">
                    {submissions.filter((s) => s.status === "DIPROSES").length}
                  </div>
                )}
                <div className="text-sm sm:text-base text-gray-600">
                  Sedang Diproses
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <div className="text-center">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-green-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {submissions.filter((s) => s.status === "SELESAI").length}
                  </div>
                )}
                <div className="text-sm sm:text-base text-gray-600">
                  Selesai
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Services Summary Row */}
        <Row gutter={[8, 8]} className="mb-6 sm:mb-8">
          {(() => {
            const svc = getServiceSummary(submissions);
            const items = [
              { label: "SURAT_KETERANGAN", value: svc.SURAT_KETERANGAN },
              { label: "KTP", value: svc.KTP },
              { label: "KK", value: svc.KK },
              { label: "AKTE LAHIR", value: svc.AKTE_LAHIR },
              { label: "SURAT PINDAH", value: svc.SURAT_PINDAH },
              { label: "SKCK", value: svc.SKCK },
            ];
            return items.map((it, idx) => (
              <Col key={it.label} xs={12} sm={8} md={8} lg={4}>
                <Card>
                  <div className="text-center">
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-green-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                    ) : (
                      <div className="text-lg sm:text-2xl font-bold text-green-600">
                        {it.value}
                      </div>
                    )}
                    <div className="text-xs sm:text-sm text-gray-600">
                      {it.label}
                    </div>
                  </div>
                </Card>
              </Col>
            ));
          })()}
        </Row>

        {/* Charts Row */}
        <Row gutter={[8, 8]} className="mb-6 sm:mb-8">
          <Col xs={24} lg={12}>
            <Card title="Distribusi Status Pengajuan" headStyle={{ backgroundColor: "#198754", color: "white" }}>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <svg className="animate-spin h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Memuat data chart...</p>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center text-gray-500">
                    <svg className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-base sm:text-lg font-medium">Belum ada data</p>
                    <p className="text-xs sm:text-sm">Data chart akan muncul setelah ada pengajuan</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Distribusi Jenis Layanan"  headStyle={{ backgroundColor: "#198754", color: "white" }}>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <svg className="animate-spin h-8 w-8 sm:h-12 sm:w-12 text-green-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Memuat data chart...</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    {(() => {
                      const svc = getServiceSummary(submissions);
                      const svcData = [
                        { name: "SURAT_KETERANGAN", value: svc.SURAT_KETERANGAN },
                        { name: "KTP", value: svc.KTP },
                        { name: "KK", value: svc.KK },
                        { name: "AKTE LAHIR", value: svc.AKTE_LAHIR },
                        { name: "SURAT PINDAH", value: svc.SURAT_PINDAH },
                        { name: "SKCK", value: svc.SKCK },
                      ].filter((d) => d.value > 0);
                      return (
                        <Pie data={svcData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#198754" dataKey="value">
                          {svcData.map((entry, idx) => (
                            <Cell key={`cell-svc-${idx}`} fill={SERVICE_COLORS[idx % SERVICE_COLORS.length]} />
                          ))}
                        </Pie>
                      );
                    })()}
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>

        {/* Table */}
        <Card 
          title="Daftar Pengajuan"
          extra={
            <Space>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={exportToCSV}
                disabled={loading || filteredSubmissions.length === 0}
                size="small"
              >
                Export CSV
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                disabled={refreshing || loading}
                size="small"
              >
                Refresh
              </Button>
            </Space>
          }
        >
          {/* Enhanced Filter Controls */}
          <div className="mb-4 space-y-3">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="Cari di semua kolom..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  onSearch={handleSearch}
                  enterButton={<SearchOutlined />}
                  allowClear
                  disabled={loading || Object.values(updatingStatus).some(Boolean)}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: "100%" }}
                  placeholder="Filter by status"
                  disabled={loading || Object.values(updatingStatus).some(Boolean)}
                  loading={loading}
                >
                  <Option value="ALL">Semua Status</Option>
                  <Option value="PENGAJUAN_BARU">Pengajuan Baru</Option>
                  <Option value="DIPROSES">Sedang Diproses</Option>
                  <Option value="SELESAI">Selesai</Option>
                  <Option value="DITOLAK">Ditolak</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'tracking_code',
                        label: (
                          <Checkbox
                            checked={visibleColumns.tracking_code}
                            onChange={(e) => handleColumnVisibilityChange('tracking_code', e.target.checked)}
                          >
                            Kode Tracking
                          </Checkbox>
                        ),
                      },
                      {
                        key: 'nama',
                        label: (
                          <Checkbox
                            checked={visibleColumns.nama}
                            onChange={(e) => handleColumnVisibilityChange('nama', e.target.checked)}
                          >
                            Nama
                          </Checkbox>
                        ),
                      },
                      {
                        key: 'jenis_layanan',
                        label: (
                          <Checkbox
                            checked={visibleColumns.jenis_layanan}
                            onChange={(e) => handleColumnVisibilityChange('jenis_layanan', e.target.checked)}
                          >
                            Jenis Layanan
                          </Checkbox>
                        ),
                      },
                      {
                        key: 'status',
                        label: (
                          <Checkbox
                            checked={visibleColumns.status}
                            onChange={(e) => handleColumnVisibilityChange('status', e.target.checked)}
                          >
                            Status
                          </Checkbox>
                        ),
                      },
                      {
                        key: 'created_at',
                        label: (
                          <Checkbox
                            checked={visibleColumns.created_at}
                            onChange={(e) => handleColumnVisibilityChange('created_at', e.target.checked)}
                          >
                            Dibuat
                          </Checkbox>
                        ),
                      },
                      {
                        key: 'updated_at',
                        label: (
                          <Checkbox
                            checked={visibleColumns.updated_at}
                            onChange={(e) => handleColumnVisibilityChange('updated_at', e.target.checked)}
                          >
                            Diupdate
                          </Checkbox>
                        ),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button icon={<EyeOutlined />} size="small">
                    Kolom
                  </Button>
                </Dropdown>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Button 
                  icon={<ClearOutlined />} 
                  onClick={clearFilters}
                  disabled={loading || Object.values(updatingStatus).some(Boolean)}
                  size="small"
                  style={{ width: '100%' }}
                >
                  Clear
                </Button>
              </Col>
            </Row>
            {loading && (
              <div className="text-center text-xs sm:text-sm text-gray-500">
                Memuat data...
              </div>
            )}
            {(searchText || statusFilter !== "ALL") && (
              <div className="text-center text-xs sm:text-sm text-blue-600">
                Menampilkan {filteredSubmissions.length} dari {submissions.length} pengajuan
              </div>
            )}
          </div>

          <div className="relative">
            <Table
              columns={columns.filter(col => visibleColumns[col.key])}
              dataSource={filteredSubmissions}
              rowKey="id"
              loading={loading}
              scroll={{ x: 800, y: 400 }}
              onChange={handleTableChange}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} dari ${total} pengajuan`,
                size: "small",
                responsive: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showLessItems: true,
              }}
              size="small"
              className="responsive-table"
              bordered={false}
              tableLayout="fixed"
              showSorterTooltip={false}
            />

            {/* Loading overlay when any status is being updated */}
            {Object.values(updatingStatus).some(Boolean) && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-blue-600 font-medium text-sm sm:text-base">
                    Memperbarui status...
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Custom CSS for responsive table */}
      <style jsx global>{`
        .responsive-table .ant-table {
          overflow-x: auto;
        }

        .responsive-table .ant-table-thead > tr > th,
        .responsive-table .ant-table-tbody > tr > td {
          padding: 8px 12px;
          word-wrap: break-word;
          word-break: break-word;
        }

        .responsive-table .ant-table-thead > tr > th {
          background-color: #fafafa;
          font-weight: 600;
          color: #262626;
        }

        .responsive-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .responsive-table .ant-table {
            font-size: 11px;
          }

          .responsive-table .ant-table-thead > tr > th,
          .responsive-table .ant-table-tbody > tr > td {
            padding: 4px 6px;
            font-size: 10px;
          }

          .responsive-table .ant-table-pagination {
            font-size: 11px;
          }

          .responsive-table .ant-table-scroll {
            overflow-x: auto;
          }

          /* Ensure tracking code doesn't overflow */
          .responsive-table .ant-table-tbody > tr > td:first-child {
            max-width: 80px;
            min-width: 80px;
          }

          /* Compact status column */
          .responsive-table .ant-table-tbody > tr > td:nth-child(4) {
            max-width: 140px;
            min-width: 140px;
          }

          /* Compact nama and jenis layanan columns */
          .responsive-table .ant-table-tbody > tr > td:nth-child(2),
          .responsive-table .ant-table-tbody > tr > td:nth-child(3) {
            max-width: 80px;
            min-width: 80px;
          }
        }

        /* Small mobile devices */
        @media (max-width: 480px) {
          .responsive-table .ant-table-thead > tr > th,
          .responsive-table .ant-table-tbody > tr > td {
            padding: 2px 4px;
            font-size: 9px;
          }

          .responsive-table .ant-table-tbody > tr > td:first-child {
            max-width: 70px;
            min-width: 70px;
          }

          .responsive-table .ant-table-tbody > tr > td:nth-child(2),
          .responsive-table .ant-table-tbody > tr > td:nth-child(3) {
            max-width: 70px;
            min-width: 70px;
          }

          .responsive-table .ant-table-tbody > tr > td:nth-child(4) {
            max-width: 120px;
            min-width: 120px;
          }
        }
      `}</style>
    </div>
  );
}
