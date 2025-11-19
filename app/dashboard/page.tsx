'use client';

import CreateJobCardForm from '@/components/CreateJobCardForm';
import { DashboardHeader } from '@/components/DashboardHeader';
import { JobCardItem } from '@/components/JobCardItem';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { JobCard } from '@/models/job-card';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type FilterState = {
  status?: string;
  priority?: string;
  materialSize: string[];
  materialType: string[];
  enquirySize: string[];
  quotationStatus?: string;
  overdue?: boolean;
  search: string;
};

type SortOption = {
  field: string;
  order: 'asc' | 'desc';
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    activeJobs: 0,
    completedJobs: 0,
    overdueJobs: 0,
    priorityJobs: 0,
  });

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [filteredJobCards, setFilteredJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    materialSize: [],
    materialType: [],
    enquirySize: [],
    search: '',
  });

  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'created_at',
    order: 'desc',
  });

  const [quickFilter, setQuickFilter] = useState<string>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/job-cards', { cache: 'no-store' });
      const json = await res.json();
      const list: JobCard[] = json?.data || [];
      setJobCards(list);
      setFilteredJobCards(list);

      const today = new Date().toISOString().split('T')[0];
      const statsData = {
        activeJobs: list.filter(j => j.overall_status === 'Active').length,
        completedJobs: list.filter(j => j.overall_status === 'Completed').length,
        overdueJobs: list.filter(j => j.due_date < today && j.overall_status !== 'Completed').length,
        priorityJobs: list.filter(j => j.priority === 'High' || j.priority === 'Urgent').length,
      };
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, sortOption, quickFilter, jobCards]);

  const applyFiltersAndSort = () => {
    let filtered = [...jobCards];

    if (quickFilter === 'active') {
      filtered = filtered.filter(jc => jc.overall_status === 'Active');
    } else if (quickFilter === 'completed') {
      filtered = filtered.filter(jc => jc.overall_status === 'Completed');
    } else if (quickFilter === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(jc => jc.due_date < today && jc.overall_status !== 'Completed');
    } else if (quickFilter === 'priority') {
      filtered = filtered.filter(jc => jc.priority === 'High' || jc.priority === 'Urgent');
    }

    if (filters.status) {
      filtered = filtered.filter(jc => jc.overall_status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter(jc => jc.priority === filters.priority);
    }

    if (filters.materialSize.length > 0) {
      filtered = filtered.filter(jc => filters.materialSize.includes(jc.material_size));
    }

    if (filters.materialType.length > 0) {
      filtered = filtered.filter(jc => filters.materialType.includes(jc.material_type));
    }

    if (filters.enquirySize.length > 0) {
      filtered = filtered.filter(jc => jc.enquiry_size && filters.enquirySize.includes(jc.enquiry_size));
    }

    if (filters.quotationStatus) {
      filtered = filtered.filter(jc => jc.quotation_status === filters.quotationStatus);
    }

    if (filters.overdue) {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(jc => jc.due_date < today && jc.overall_status !== 'Completed');
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        jc =>
          jc.job_card_number.toLowerCase().includes(searchLower) ||
          jc.customer_name.toLowerCase().includes(searchLower) ||
          jc.phone_number.includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortOption.field as keyof JobCard];
      let bVal: any = b[sortOption.field as keyof JobCard];

      if (sortOption.field === 'due_date' || sortOption.field === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOption.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredJobCards(filtered);
  };

  const toggleMaterialSize = (size: string) => {
    setFilters(prev => ({
      ...prev,
      materialSize: prev.materialSize.includes(size)
        ? prev.materialSize.filter(s => s !== size)
        : [...prev.materialSize, size],
    }));
  };

  const toggleMaterialType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      materialType: prev.materialType.includes(type)
        ? prev.materialType.filter(t => t !== type)
        : [...prev.materialType, type],
    }));
  };

  const toggleEnquirySize = (size: string) => {
    setFilters(prev => ({
      ...prev,
      enquirySize: prev.enquirySize.includes(size)
        ? prev.enquirySize.filter(s => s !== size)
        : [...prev.enquirySize, size],
    }));
  };

  const clearFilters = () => {
    setFilters({
      materialSize: [],
      materialType: [],
      enquirySize: [],
      search: '',
    });
    setQuickFilter('all');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Active Jobs" 
            value={stats.activeJobs} 
            icon={Briefcase} 
            color="text-blue-600" 
            description="Currently in progress" 
          />
          <StatCard 
            title="Completed Jobs" 
            value={stats.completedJobs} 
            icon={CheckCircle2} 
            color="text-green-600" 
            description="Successfully finished" 
          />
          <StatCard 
            title="Overdue Jobs" 
            value={stats.overdueJobs} 
            icon={AlertCircle} 
            color="text-red-600" 
            description="Past due date" 
          />
          <StatCard 
            title="Priority Jobs" 
            value={stats.priorityJobs} 
            icon={TrendingUp} 
            color="text-orange-600" 
            description="High & urgent priority" 
          />
        </div>

        {/* Quick Filters + Create Button */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'completed', 'overdue', 'priority'].map(type => (
              <Button
                key={type}
                variant={quickFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter(type)}
              >
                {type === 'all' ? 'All Jobs' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Job Card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Job Card</DialogTitle>
                <DialogDescription>
                  Enter the details for the new job card. All required fields must be filled.
                </DialogDescription>
              </DialogHeader>
              <CreateJobCardForm
                userId={user.id}
                onSuccess={() => {
                  setCreateDialogOpen(false);
                  fetchData();
                  toast({ title: 'Success', description: 'Job card created successfully' });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search, Sort (NEW), and Advanced Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by job number, customer name, or phone..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Sort Dropdown (MOVED HERE) */}
          <Select
            value={`${sortOption.field}-${sortOption.order}`}
            onValueChange={(value) => {
              const [field, order] = value.split('-') as [string, 'asc' | 'desc'];
              setSortOption({ field, order });
            }}
          >
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date-asc">Due Date (Nearest First)</SelectItem>
              <SelectItem value="due_date-desc">Due Date (Farthest First)</SelectItem>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="progress_percentage-desc">Progress (High to Low)</SelectItem>
              <SelectItem value="progress_percentage-asc">Progress (Low to High)</SelectItem>
              <SelectItem value="remaining_stages-asc">Remaining Stages (Least First)</SelectItem>
              <SelectItem value="remaining_stages-desc">Remaining Stages (Most First)</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced Filters Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Options</SheetTitle>
                <SheetDescription>
                  Apply advanced filters to find specific job cards
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={filters.priority || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Material Size */}
                <div className="space-y-3">
                  <Label>Material Size</Label>
                  {['0.8mm', '1mm', '1.2mm', '1.5mm', '2mm', '3mm', '4mm', '5mm', '6mm', '8mm', '10mm', '12mm', '16mm'].map(size => (
                    <div key={size} className="flex items-center space-x-2">
                      <Checkbox
                        id={`size-${size}`}
                        checked={filters.materialSize.includes(size)}
                        onCheckedChange={() => toggleMaterialSize(size)}
                      />
                      <label htmlFor={`size-${size}`} className="text-sm cursor-pointer">
                        {size}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Material Type */}
                <div className="space-y-3">
                  <Label>Material Type</Label>
                  {['Steel', 'Aluminum', 'Stainless Steel', 'Iron'].map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={filters.materialType.includes(type)}
                        onCheckedChange={() => toggleMaterialType(type)}
                      />
                      <label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Enquiry Size */}
                <div className="space-y-3">
                  <Label>Enquiry Size</Label>
                  {['Small', 'Medium', 'Large'].map(size => (
                    <div key={size} className="flex items-center space-x-2">
                      <Checkbox
                        id={`enquiry-${size}`}
                        checked={filters.enquirySize.includes(size)}
                        onCheckedChange={() => toggleEnquirySize(size)}
                      />
                      <label htmlFor={`enquiry-${size}`} className="text-sm cursor-pointer">
                        {size}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Quotation Status */}
                <div className="space-y-2">
                  <Label>Quotation Status</Label>
                  <Select
                    value={filters.quotationStatus || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, quotationStatus: value === 'all' ? undefined : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Quotation Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending Payment</SelectItem>
                      <SelectItem value="Partial">Partially Paid</SelectItem>
                      <SelectItem value="Completed">Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Overdue Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overdue"
                    checked={filters.overdue || false}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, overdue: !!checked }))
                    }
                  />
                  <Label htmlFor="overdue" className="text-sm cursor-pointer">
                    Show only overdue jobs
                  </Label>
                </div>

                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Job Cards List */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredJobCards.length)}-{Math.min(currentPage * itemsPerPage, filteredJobCards.length)} of {filteredJobCards.length} job cards
            </p>
            
            {filteredJobCards.length > itemsPerPage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(filteredJobCards.length / itemsPerPage) }, (_, i) => i + 1).map(pageNum => (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredJobCards.length / itemsPerPage), p + 1))}
                  disabled={currentPage * itemsPerPage >= filteredJobCards.length}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {filteredJobCards.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No job cards found</h3>
              <p className="text-muted-foreground mb-4">
                {jobCards.length === 0
                  ? 'Create your first job card to get started'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredJobCards
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map(jobCard => (
                  <JobCardItem key={jobCard.id} jobCard={jobCard} />
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}