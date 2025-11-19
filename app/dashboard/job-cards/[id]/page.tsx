'use client';

import { DashboardHeader } from '@/components/DashboardHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { JobCard } from '@/models/job-card';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { ArrowLeft, Calendar, CheckCircle2, Mail, Phone, Save, Trash2, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const stageLabels = {
  drawing: 'Drawing',
  materialDocumentAndCutting: 'Material Document & Cutting',
  bending: 'Bending',
  fabrication: 'Fabrication',
  coating: 'Coating',
  dispatch: 'Dispatch',
};

export default function JobCardDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(true); // Always start in edit mode

  const [formData, setFormData] = useState<Partial<JobCard>>({
    quotation_amount: 0,
    quotation_received_amount: 0,
    quotation_status: 'Pending'
  });

  useEffect(() => {
    fetchJobCard();
  }, [params.id]);

  const fetchJobCard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/job-cards/${params.id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json?.error) {
        toast({ title: 'Error', description: json?.error || 'Failed to load job card', variant: 'destructive' });
      } else {
        setJobCard(json.data as JobCard);
        setFormData(json.data as JobCard);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/job-cards/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.id }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        toast({ title: 'Error', description: json?.error || 'Failed to update job card', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Job card updated successfully' });
        setJobCard(json.data as JobCard);
        setFormData(json.data as JobCard);
        setEditMode(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/job-cards/${params.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || json?.error) {
      toast({ title: 'Error', description: json?.error || 'Failed to delete job card', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Job card deleted successfully' });
      router.push('/dashboard');
    }
  };

  const toggleStageRequired = (stageName: keyof JobCard['stages']) => {
    setFormData(prev => ({
      ...prev,
      stages: {
        ...prev.stages!,
        [stageName]: {
          ...prev.stages![stageName],
          required: !prev.stages![stageName].required,
        },
      },
    }));
  };

  const toggleStageCompleted = (stageName: keyof JobCard['stages']) => {
    const isCompleted = !formData.stages![stageName].completed;
    setFormData(prev => ({
      ...prev,
      stages: {
        ...prev.stages!,
        [stageName]: {
          ...prev.stages![stageName],
          completed: isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : null,
        },
      },
    }));
  };

  const updateStageNotes = (stageName: keyof JobCard['stages'], notes: string) => {
    setFormData(prev => ({
      ...prev,
      stages: {
        ...prev.stages!,
        [stageName]: {
          ...prev.stages![stageName],
          notes,
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading job card...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Job Card Not Found</h2>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isOverdue = isPast(parseISO(jobCard.due_date)) && jobCard.overall_status !== 'Completed';

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Job Card
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Job Card?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {jobCard.job_card_number}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Floating Save Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Save className="mr-2 h-5 w-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl">{jobCard.job_card_number}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Created: {format(parseISO(jobCard.created_at), 'PPP')}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge className={
                  jobCard.overall_status === 'Active' ? 'bg-blue-100 text-blue-800' :
                  jobCard.overall_status === 'Completed' ? 'bg-green-100 text-green-800' :
                  jobCard.overall_status === 'On Hold' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }>
                  {jobCard.overall_status}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive">OVERDUE</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        value={formData.customer_name || ''}
                        onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={formData.phone_number || ''}
                        onChange={e => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.customer_email || ''}
                        onChange={e => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Name:</span>
                      <span>{jobCard.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{jobCard.phone_number}</span>
                    </div>
                    {jobCard.customer_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{jobCard.customer_email}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Material Size</Label>
                        <Select
                          value={formData.material_size}
                          onValueChange={value => setFormData(prev => ({ ...prev, material_size: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          {/* ['0.8mm', '1mm', '1.2mm', '1.5mm', '2mm', '3mm', '4mm', '5mm', '6mm', '8mm', '10mm', '12mm', '16mm'] */}
                          <SelectContent>
                            <SelectItem value="0.8mm">0.8mm</SelectItem>
                            <SelectItem value="1mm">1mm</SelectItem>
                            <SelectItem value="1.2mm">1.2mm</SelectItem>
                            <SelectItem value="1.5mm">1.5mm</SelectItem>
                            <SelectItem value="2mm">2mm</SelectItem>
                            <SelectItem value="3mm">3mm</SelectItem>
                            <SelectItem value="4mm">4mm</SelectItem>
                            <SelectItem value="5mm">5mm</SelectItem>
                            <SelectItem value="6mm">6mm</SelectItem>
                            <SelectItem value="8mm">8mm</SelectItem>
                            <SelectItem value="10mm">10mm</SelectItem>
                            <SelectItem value="12mm">12mm</SelectItem>
                            <SelectItem value="16mm">16mm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Material Type</Label>
                        <Select
                          value={formData.material_type}
                          onValueChange={value => setFormData(prev => ({ ...prev, material_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Steel">Steel</SelectItem>
                            <SelectItem value="Aluminum">Aluminum</SelectItem>
                            <SelectItem value="Stainless Steel">Stainless Steel</SelectItem>
                            <SelectItem value="Iron">Iron</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={value => setFormData(prev => ({ ...prev, priority: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">Material:</span>
                      <span>{jobCard.material_size} {jobCard.material_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">Due Date:</span>
                      <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                        {format(parseISO(jobCard.due_date), 'PPP')}
                        {' '}({formatDistanceToNow(parseISO(jobCard.due_date), { addSuffix: true })})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Priority:</span>
                      <Badge variant={
                        jobCard.priority === 'Urgent' ? 'destructive' :
                        jobCard.priority === 'High' ? 'default' :
                        'secondary'
                      }>
                        {jobCard.priority}
                      </Badge>
                    </div>
                    {jobCard.enquiry_size && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Enquiry Size:</span>
                        <Badge variant="outline">{jobCard.enquiry_size}</Badge>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label>Quotation Amount (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.quotation_amount || ''}
                        onChange={e => setFormData(prev => ({ ...prev, quotation_amount: parseFloat(e.target.value) || undefined }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount Received (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.quotation_received_amount || ''}
                        onChange={e => {
                          const received = parseFloat(e.target.value) || 0;
                          const amount = formData.quotation_amount || 0;
                          let status: 'Pending' | 'Partial' | 'Completed' = 'Pending';
                          
                          if (received > 0) {
                            status = received >= amount ? 'Completed' : 'Partial';
                          }
                          
                          setFormData(prev => ({
                            ...prev,
                            quotation_received_amount: received,
                            quotation_status: status
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                        <Badge 
                          className={
                            formData.quotation_status === 'Completed' ? 'bg-green-100 text-green-700' :
                            formData.quotation_status === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }
                        >
                          {formData.quotation_status}
                        </Badge>
                        {formData.quotation_status === 'Partial' && (
                          <span className="text-sm text-muted-foreground">
                            Remaining: ₹{((formData.quotation_amount || 0) - (formData.quotation_received_amount || 0)).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Quotation Notes</Label>
                      <Textarea
                        value={formData.quotation_notes || ''}
                        onChange={e => setFormData(prev => ({ ...prev, quotation_notes: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">₹{jobCard.quotation_amount.toLocaleString('en-IN')}</span>
                        {jobCard.quotation_received_amount > 0 && (
                          <span className="text-sm text-muted-foreground">
                            of {jobCard.quotation_status === 'Completed' ? 'paid' : 'received'} ₹{jobCard.quotation_received_amount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      
                      {jobCard.quotation_status === 'Partial' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Remaining:</span>
                            <span>₹{(jobCard.quotation_amount - jobCard.quotation_received_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <Progress 
                            value={(jobCard.quotation_received_amount / jobCard.quotation_amount) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <span className="font-semibold">Status:</span>
                        <Badge className={
                          jobCard.quotation_status === 'Completed' ? 'bg-green-100 text-green-700' :
                          jobCard.quotation_status === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {jobCard.quotation_status}
                        </Badge>
                      </div>
                      
                      {jobCard.quotation_notes && (
                        <div className="pt-2">
                          <span className="font-semibold">Notes:</span>
                          <p className="text-sm text-muted-foreground mt-1">{jobCard.quotation_notes}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stage Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(stageLabels).map(([key, label]) => {
                  const stage = formData.stages![key as keyof JobCard['stages']];
                  return (
                    <div key={key} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{label}</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`required-${key}`}
                              checked={stage.required}
                              onCheckedChange={() => toggleStageRequired(key as keyof JobCard['stages'])}
                              disabled={!editMode}
                            />
                            <Label htmlFor={`required-${key}`} className="text-sm cursor-pointer">
                              Required
                            </Label>
                          </div>
                          {stage.required && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`completed-${key}`}
                                checked={stage.completed}
                                onCheckedChange={() => toggleStageCompleted(key as keyof JobCard['stages'])}
                                disabled={!editMode}
                              />
                              <Label htmlFor={`completed-${key}`} className="text-sm cursor-pointer">
                                Completed
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>

                      {stage.completed && stage.completedAt && (
                        <p className="text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          Completed on {format(parseISO(stage.completedAt), 'PPP')}
                        </p>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${key}`} className="text-xs">Notes</Label>
                        <Textarea
                          id={`notes-${key}`}
                          value={stage.notes}
                          onChange={e => updateStageNotes(key as keyof JobCard['stages'], e.target.value)}
                          rows={2}
                          placeholder="Add notes for this stage..."
                          disabled={!editMode}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - jobCard.progress_percentage / 100)}`}
                        className="text-blue-600 transition-all duration-300"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{Math.round(jobCard.progress_percentage)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Required Stages</span>
                    <span className="font-semibold">{jobCard.total_required_stages}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Completed Stages</span>
                    <span className="font-semibold text-green-600">{jobCard.completed_stages_count}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Remaining Stages</span>
                    <span className="font-semibold text-orange-600">{jobCard.remaining_stages}</span>
                  </div>
                </div>

                <Progress value={jobCard.progress_percentage} className="h-3" />
              </CardContent>
            </Card>

            {editMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Status Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Overall Status</Label>
                    <Select
                      value={formData.overall_status}
                      onValueChange={value => setFormData(prev => ({ ...prev, overall_status: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
