'use client';

import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { JobCard } from '@/models/job-card';
import { format, parseISO } from 'date-fns';
import { Search, CheckCircle2, ArrowUpDown, FileText, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Download } from "lucide-react";
import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CompletedJobsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [completedJobs, setCompletedJobs] = useState<JobCard[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'completed_at',
    direction: 'desc'
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = completedJobs.filter(
        jc =>
          jc.job_card_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          jc.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          jc.phone_number.includes(searchTerm)
      );
      setFilteredJobs(filtered);
    } else {
      setFilteredJobs(completedJobs);
    }
  }, [searchTerm, completedJobs]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/job-cards?status=Completed', { cache: 'no-store' });
      const json = await res.json();
      const data: JobCard[] = json?.data || [];
      setCompletedJobs(data);
      setFilteredJobs(data);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced payment status calculation
  const enhancedJobs = useMemo(() => {
    return filteredJobs.map(job => {
      const receivedAmount = job.quotation_received_amount || 0;
      const quotationAmount = job.quotation_amount || 0;
      let status = job.quotation_status;
      
      // Update status based on received amount
      if (status === 'Completed' && receivedAmount <= 0) {
        status = 'Pending';
      } else if (status === 'Completed' && receivedAmount < quotationAmount) {
        status = 'Partial';
      } else if (status === 'Partial' && receivedAmount >= quotationAmount) {
        status = 'Completed';
      } else if (!status && receivedAmount > 0) {
        status = receivedAmount >= quotationAmount ? 'Completed' : 'Partial';
      } else if (!status) {
        status = 'Pending';
      }

      return {
        ...job,
        _paymentStatus: status,
        _pendingAmount: Math.max(0, quotationAmount - receivedAmount)
      };
    });
  }, [filteredJobs]);

  // Sort jobs
  const sortedJobs = useMemo(() => {
    if (!sortConfig) return enhancedJobs;
    
    return [...enhancedJobs].sort((a, b) => {
      let aValue: any, bValue: any;
      
      if (sortConfig.key === 'amount') {
        aValue = a.quotation_amount || 0;
        bValue = b.quotation_amount || 0;
      } else if (sortConfig.key === 'payment_status') {
        aValue = a._paymentStatus;
        bValue = b._paymentStatus;
      } else if (sortConfig.key === 'completed_at') {
        aValue = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        bValue = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      } else {
        aValue = a[sortConfig.key as keyof JobCard] || '';
        bValue = b[sortConfig.key as keyof JobCard] || '';
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [enhancedJobs, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / rowsPerPage);
  const currentJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedJobs.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedJobs, currentPage, rowsPerPage]);

  // Update current page if it's out of bounds after filtering
  useEffect(() => {
    if (currentPage > 1) {
      const maxPage = Math.ceil(filteredJobs.length / rowsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(maxPage || 1);
      }
    }
  }, [filteredJobs.length, currentPage, rowsPerPage]);

  // Update total revenue calculation
  const totalRevenue = enhancedJobs
    .filter(jc => (jc._paymentStatus === 'Completed' || jc._paymentStatus === 'Partial') && jc.quotation_amount)
    .reduce((sum, jc) => sum + (jc.quotation_received_amount || 0), 0);

  // Calculate total pending amount
  const totalPendingAmount = enhancedJobs
    .reduce((sum, jc) => sum + jc._pendingAmount, 0);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="ml-1 h-4 w-4" /> 
      : <ChevronDown className="ml-1 h-4 w-4" />;
  };


  const exportToExcel = (filteredJobs: any[]) => {
  if (!filteredJobs || filteredJobs.length === 0) {
    alert('No jobs available to export.');
    return;
  }

  // Define headers
  const headers = [
    'Job Card Number',
    'Customer Name',
    'Phone',
    'Material',
    'Completed Date',
    'Quotation Amount',
    'Quotation Status',
  ];

  // Map data
  const rows = filteredJobs.map((jc) => ({
    'Job Card Number': jc.job_card_number,
    'Customer Name': jc.customer_name,
    'Phone': jc.phone_number,
    'Material': `${jc.material_size} ${jc.material_type}`,
    'Completed Date': jc.completed_at
      ? format(parseISO(jc.completed_at), 'PP')
      : 'N/A',
    'Quotation Amount': jc.quotation_amount
      ? `₹${jc.quotation_amount.toLocaleString('en-IN')}`
      : 'N/A',
    'Quotation Status': jc.quotation_status || 'N/A',
  }));

  // Create a worksheet from the rows
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Create a new workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Jobs');

  // Export the Excel file
  const fileName = `completed-jobs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

  const exportToCSV = () => {
    const headers = [
      'Job Card Number',
      'Customer Name',
      'Phone',
      'Material',
      'Completed Date',
      'Quotation Amount',
      'Quotation Status',
    ];

    const rows = filteredJobs.map(jc => [
      jc.job_card_number,
      jc.customer_name,
      jc.phone_number,
      `${jc.material_size} ${jc.material_type}`,
      jc.completed_at ? format(parseISO(jc.completed_at), 'PP') : 'N/A',
      jc.quotation_amount ? `₹${jc.quotation_amount}` : 'N/A',
      jc.quotation_status,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `completed-jobs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading completed jobs...</p>
          </div>
        </div>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              Completed Jobs
            </h1>
            <p className="text-muted-foreground mt-1">Archive of all completed job cards</p>
          </div>
          <Button onClick={() => exportToExcel(filteredJobs)} disabled={filteredJobs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Total Completed Jobs</p>
            <p className="text-3xl font-bold">{completedJobs.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">From received payments</p>
          </div>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Pending Amount</p>
            <p className="text-3xl font-bold text-red-600">₹{totalPendingAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </div>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Showing Results</p>
            <p className="text-3xl font-bold">{filteredJobs.length}</p>
            {searchTerm && <Badge variant="outline" className="mt-2">Filtered</Badge>}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search completed jobs by job number, customer name, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col space-y-4 px-2 py-3 border-t sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:px-4">
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  <span className="hidden sm:inline">Showing </span>
                  <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, sortedJobs.length)}</span>
                  <span className="hidden sm:inline"> of <span className="font-medium">{sortedJobs.length}</span> jobs</span>
                </div>
                
                <div className="flex items-center justify-between space-x-1 sm:space-x-2">
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="hidden sm:flex items-center justify-center px-3 py-1 text-sm border rounded-md">
                      {currentPage} / {totalPages}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-1 sm:space-x-2 ml-2 sm:ml-4">
                    <span className="hidden sm:inline text-sm text-muted-foreground whitespace-nowrap">Rows:</span>
                    <Select
                      value={rowsPerPage.toString()}
                      onValueChange={(value) => {
                        setRowsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={rowsPerPage} />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 20, 50, 100].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {currentJobs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No completed jobs found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term' : 'No jobs have been marked as completed yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Card #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('completed_at')}
                  >
                    <div className="flex items-center">
                      Completed Date
                      {getSortIcon('completed_at')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end">
                      Amount
                      {getSortIcon('amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('payment_status')}
                  >
                    <div className="flex items-center">
                      Payment Status
                      {getSortIcon('payment_status')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentJobs.map((job: any) => {
                  const isFullyPaid = job._paymentStatus === 'Completed';
                  const isPartiallyPaid = job._paymentStatus === 'Partial';
                  const pendingAmount = job._pendingAmount;

                  return (
                    <TableRow 
                      key={job.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/job-cards/${job.id}`)}
                    >
                      <TableCell className="font-medium">{job.job_card_number}</TableCell>
                      <TableCell>{job.customer_name}</TableCell>
                      <TableCell>{job.phone_number}</TableCell>
                      <TableCell>{job.material_size} {job.material_type}</TableCell>
                      <TableCell>
                        {job.completed_at ? format(parseISO(job.completed_at), 'PP') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.quotation_amount ? `₹${job.quotation_amount.toLocaleString('en-IN')}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge 
                            className={`
                              ${isFullyPaid ? 'bg-green-100 text-green-700' : 
                                isPartiallyPaid ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-gray-100 text-gray-700'} w-fit
                            `}
                          >
                            {job._paymentStatus}
                          </Badge>
                          {(isPartiallyPaid || pendingAmount > 0) && (
                            <span className="text-xs text-red-600">
                              Pending: ₹{pendingAmount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>)}
            
        </div>
      </main>
    </div>
  );
}
