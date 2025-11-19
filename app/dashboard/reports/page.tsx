"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { JobCard } from "@/models/job-card";
import {
  differenceInDays,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  DollarSign,
  Download,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function ReportsPage() {
  const { user } = useAuth();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Convert DateRange to string format for API/filtering
  const dateRange = {
    from: date?.from ? format(date.from, "yyyy-MM-dd") : "",
    to: date?.to ? format(date.to, "yyyy-MM-dd") : "",
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/job-cards", { cache: "no-store" });
      const json = await res.json();
      const data: JobCard[] = json?.data || [];
      setJobCards(data);
    } finally {
      setLoading(false);
    }
  };

  const filterByDateRange = (jobCards: JobCard[]) => {
    if (!dateRange.from || !dateRange.to) return jobCards;
    
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    
    // Set the end of the day for the 'to' date to include the entire day
    to.setHours(23, 59, 59, 999);
    
    return jobCards.filter((jc) => {
      const createdAt = new Date(jc.created_at);
      return isWithinInterval(createdAt, { start: from, end: to });
    });
  };

  // Apply date range filtering to job cards
  const filteredJobCards = useMemo(() => {
    return filterByDateRange(jobCards);
  }, [jobCards, dateRange]);

  const completedJobs = useMemo(() => 
    filteredJobCards.filter((jc: JobCard) => jc.overall_status === "Completed"),
    [filteredJobCards]
  );

  const activeJobs = useMemo(() => 
    filteredJobCards.filter((jc: JobCard) => jc.overall_status === "Active"),
    [filteredJobCards]
  );

  const today = new Date().toISOString().split("T")[0];
  const overdueJobs = useMemo(() => 
    jobCards.filter((jc: JobCard) => jc.due_date < today && jc.overall_status !== "Completed"),
    [jobCards, today]
  );

  const todayCompleted = useMemo(() => 
    jobCards.filter((jc: JobCard) => {
      const completedDate = jc.completed_at ? jc.completed_at.split("T")[0] : null;
      return completedDate === today;
    }),
    [jobCards, today]
  );

  const totalRevenue = useMemo(() => 
    filteredJobCards.reduce((sum: number, jc: JobCard) => {
      if (jc.quotation_status === "Completed") {
        // For completed jobs, add the full quotation amount
        return sum + (jc.quotation_amount || 0);
      } else if (jc.quotation_status === "Partial") {
        // For partial payments, add the received amount
        return sum + (jc.quotation_received_amount || 0);
      }
      return sum;
    }, 0),
    [filteredJobCards]
  );

  const averageCompletionTime = useMemo(() => {
    if (completedJobs.length === 0) return 0;
    
    const totalDays = completedJobs.reduce((sum: number, jc: JobCard) => {
      if (jc.completed_at) {
        const days = differenceInDays(
          parseISO(jc.completed_at),
          parseISO(jc.created_at)
        );
        return sum + days;
      }
      return sum;
    }, 0);
    
    return totalDays / completedJobs.length;
  }, [completedJobs]);

  const materialSizeBreakdown = useMemo(() => 
    filteredJobCards.reduce((acc: Record<string, number>, jc: JobCard) => {
      acc[jc.material_size] = (acc[jc.material_size] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    [filteredJobCards]
  );

  const quotationSummary = useMemo(() => ({
    total: filteredJobCards.length,
    completed: filteredJobCards.filter(
      (jc: JobCard) => jc.quotation_status === "Completed"
    ).length,
    partial: filteredJobCards.filter(
      (jc: JobCard) => jc.quotation_status === "Partial"
    ).length,
    pending: filteredJobCards.filter(
      (jc: JobCard) => jc.quotation_status === "Pending"
    ).length,
  }), [filteredJobCards]);

  const conversionRate = useMemo(() => 
    quotationSummary.total > 0
      ? ((quotationSummary.completed / quotationSummary.total) * 100).toFixed(1)
      : 0,
    [quotationSummary]
  );

  const stageBreakdown = useMemo(() => 
    Object.keys(jobCards[0]?.stages || {}).reduce<Record<string, number>>(
      (acc, stageName) => {
        const count = jobCards.filter(
          (jc: JobCard) =>
            jc.stages[stageName as keyof JobCard["stages"]]?.required &&
            !jc.stages[stageName as keyof JobCard["stages"]]?.completed
        ).length;
        acc[stageName] = count;
        return acc;
      },
      {}
    ),
    [jobCards]
  );

  const exportToExcel = (data: JobCard[], filename: string) => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Define headers
    const headers = [
      "Job Card Number",
      "Customer Name",
      "Phone",
      "Material",
      "Due Date",
      "Status",
      "Progress",
      "Quotation",
    ];

    // Format rows for export
    const rows = data.map((jc) => [
      jc.job_card_number,
      jc.customer_name,
      jc.phone_number,
      `${jc.material_size} ${jc.material_type}`,
      jc.due_date ? format(parseISO(jc.due_date), "MMM dd, yyyy") : "N/A",
      jc.overall_status,
      `${jc.progress_percentage ?? 0}%`,
      jc.quotation_amount
        ? `₹${jc.quotation_amount.toLocaleString("en-IN")}`
        : "N/A",
    ]);

    // Combine headers + rows
    const worksheetData = [headers, ...rows];

    // Create a worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Apply bold headers and auto column widths
    const range = XLSX.utils.decode_range(worksheet["!ref"]!);
    const columnWidths: { wch: number }[] = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = headers[C].length;
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) maxWidth = cellLength;
        }
      }
      columnWidths.push({ wch: maxWidth + 2 });
    }

    worksheet["!cols"] = columnWidths;

    // Bold header styling (simple XLSX font style)
    headers.forEach((_, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      if (!worksheet[cellRef]) return;
      worksheet[cellRef].s = {
        font: { bold: true },
        alignment: { horizontal: "center" },
      };
    });

    // Create workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Job Cards");

    // Export file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToCSV = (data: JobCard[], filename: string) => {
    const headers = [
      "Job Card Number",
      "Customer Name",
      "Phone",
      "Material",
      "Due Date",
      "Status",
      "Progress",
      "Quotation",
    ];
    const rows = data.map((jc) => [
      jc.job_card_number,
      jc.customer_name,
      jc.phone_number,
      `${jc.material_size} ${jc.material_type}`,
      jc.due_date,
      jc.overall_status,
      `${jc.progress_percentage}%`,
      jc.quotation_amount ? `₹${jc.quotation_amount}` : "N/A",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
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
            <p className="mt-4 text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dateRange.from && dateRange.to ? (
                <>
                  Showing data from {format(new Date(dateRange.from), 'MMM d, yyyy')} to {format(new Date(dateRange.to), 'MMM d, yyyy')}
                </>
              ) : (
                'Select a date range to filter the data'
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full md:w-[300px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} - {" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                setDate({
                  from: startOfMonth(today),
                  to: endOfMonth(today),
                });
              }}
            >
              This Month
            </Button>
            <Button
              onClick={() =>
                exportToExcel(
                  filteredJobCards,
                  `job-cards-report-${format(new Date(), "yyyy-MM-dd")}`
                )
              }
              className="whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Jobs Created
              </CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {filteredJobCards.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Jobs
              </CardTitle>
              <CalendarIcon className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedJobs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From completed quotations and partial payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Completion Time
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round(averageCompletionTime)} days
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average time to complete
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Completed Jobs</CardTitle>
              <CardDescription>
                {todayCompleted.length} jobs completed today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayCompleted.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No jobs completed today
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Card</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Quotation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayCompleted.slice(0, 5).map((jc) => (
                      <TableRow key={jc.id}>
                        <TableCell className="font-medium">
                          {jc.job_card_number}
                        </TableCell>
                        <TableCell>{jc.customer_name}</TableCell>
                        <TableCell>
                          {jc.quotation_amount
                            ? `₹${jc.quotation_amount.toLocaleString("en-IN")}`
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending/Active Jobs</CardTitle>
              <CardDescription>{activeJobs.length} active jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {activeJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active jobs
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Card</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeJobs.slice(0, 5).map((jc) => (
                      <TableRow key={jc.id}>
                        <TableCell className="font-medium">
                          {jc.job_card_number}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(jc.due_date), "PP")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {Math.round(jc.progress_percentage)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overdue Jobs</CardTitle>
              <CardDescription className="text-red-600">
                {overdueJobs.length} jobs past due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No overdue jobs
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Card</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueJobs.slice(0, 5).map((jc) => {
                      const daysOverdue = differenceInDays(
                        new Date(),
                        parseISO(jc.due_date)
                      );
                      return (
                        <TableRow key={jc.id} className="bg-red-50">
                          <TableCell className="font-medium">
                            {jc.job_card_number}
                          </TableCell>
                          <TableCell>{jc.customer_name}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {daysOverdue} days
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Material Size Distribution</CardTitle>
              <CardDescription>Jobs by material size</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(materialSizeBreakdown).map(([size, count]) => (
                  <div key={size} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{size}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              (count / filteredJobCards.length) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotation Summary</CardTitle>
              <CardDescription>Quotation conversion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Quotations</span>
                  <span className="font-semibold">
                    {quotationSummary.total}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed</span>
                  <Badge className="bg-green-100 text-green-700">
                    {quotationSummary.completed}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Partial</span>
                  <Badge className="bg-red-100 text-red-700">
                    {quotationSummary.partial}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending</span>
                  <Badge className="bg-gray-100 text-gray-700">
                    {quotationSummary.pending}
                  </Badge>
                </div>
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="font-semibold">Conversion Rate</span>
                  <span className="text-lg font-bold text-green-600">
                    {conversionRate}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stage-wise Job Distribution</CardTitle>
              <CardDescription>Jobs currently at each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stageBreakdown).map(([stage, count]) => {
                  const stageLabels: Record<string, string> = {
                    drawing: "Drawing",
                    materialDocumentAndCutting: "Cutting",
                    bending: "Bending",
                    fabrication: "Fabrication",
                    coating: "Coating",
                    dispatch: "Dispatch",
                  };
                  return (
                    <div
                      key={stage}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {stageLabels[stage]}
                      </span>
                      <Badge variant="outline">{count} jobs</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
