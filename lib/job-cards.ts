import type { JobCard, QuotationStatus } from '@/models/job-card';
import { generateJobCardNumber, getJobCardsCollection } from './mongodb';
import { ObjectId } from 'mongodb';

export function computeQuotationStatus(job: { quotation_amount?: number; quotation_received_amount?: number }): QuotationStatus {
  const received = job.quotation_received_amount ?? 0;
  const amount = job.quotation_amount ?? 0;
  
  if (received <= 0) return 'Pending';
  if (received < amount) return 'Partial';
  return 'Completed';
}

export function computeRemainingAmount(job: { quotation_amount?: number; quotation_received_amount?: number }): number {
  return (job.quotation_amount ?? 0) - (job.quotation_received_amount ?? 0);
}

export function calculateJobCardMetrics(stages: JobCard['stages']) {
  const stageKeys = Object.keys(stages) as Array<keyof JobCard['stages']>;

  const totalRequired = stageKeys.filter(key => stages[key].required).length;
  const completedCount = stageKeys.filter(
    key => stages[key].required && stages[key].completed
  ).length;

  const progress = totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0;
  const remaining = totalRequired - completedCount;

  let enquirySize: 'Small' | 'Medium' | 'Large' = 'Small';
  if (totalRequired >= 5) enquirySize = 'Large';
  else if (totalRequired >= 3) enquirySize = 'Medium';

  return {
    total_required_stages: totalRequired,
    completed_stages_count: completedCount,
    progress_percentage: Math.round(progress * 100) / 100,
    remaining_stages: remaining,
    enquiry_size: enquirySize,
  };
}

export async function createJobCard(data: Partial<JobCard>, userId: string): Promise<{ data: JobCard | null; error: string | null }> {
  try {
    const jobNumberData = await generateJobCardNumber();

    const metrics = calculateJobCardMetrics(data.stages!);
    
    // Ensure quotation fields have proper defaults
    const quotationData = {
      quotation_amount: data.quotation_amount ?? 0,
      quotation_received_amount: data.quotation_received_amount ?? 0,
      quotation_status: computeQuotationStatus({
        quotation_amount: data.quotation_amount,
        quotation_received_amount: data.quotation_received_amount
      })
    };

    const jobCard: Partial<JobCard> = {
      ...data,
      ...quotationData,
      job_card_number: jobNumberData,
      ...metrics,
      created_by: userId,
      last_updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const col = await getJobCardsCollection();
    const res = await col.insertOne(jobCard as JobCard);
    const inserted = await col.findOne({ _id: res.insertedId });

    if (!inserted) return { data: null, error: 'Failed to create job card' };

    // normalize Mongo _id to id string
    const normalized: any = { ...inserted, id: String(inserted._id) };
    delete normalized._id;

    return { data: (normalized as unknown) as JobCard, error: null };
  } catch (err) {
    return { data: null, error: 'Failed to create job card' };
  }
}

export async function updateJobCard(id: string, data: Partial<JobCard>, userId: string): Promise<{ data: JobCard | null; error: string | null }> {
  try {
    // Handle quotation status updates
    if (data.quotation_amount !== undefined || data.quotation_received_amount !== undefined) {
      const currentData = await getJobCardById(id);
      const current = currentData.data;
      
      // Use existing values if not being updated
      const quotation_amount = data.quotation_amount ?? current?.quotation_amount ?? 0;
      const quotation_received_amount = data.quotation_received_amount ?? current?.quotation_received_amount ?? 0;
      
      // Update the status based on the new values
      data.quotation_status = computeQuotationStatus({
        quotation_amount,
        quotation_received_amount
      });
    }

    if (data.stages) {
      const metrics = calculateJobCardMetrics(data.stages);
      Object.assign(data, metrics);

      if (metrics.progress_percentage === 100 && data.overall_status !== 'Completed') {
        data.overall_status = 'Completed';
        data.completed_at = new Date().toISOString();
      }
    }

    const col = await getJobCardsCollection();
    const updated = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          last_updated_by: userId,
          updated_at: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' as any }
    );

    if (!updated.value) return { data: null, error: 'Failed to update job card' };

    const anyd: any = { ...updated.value, id: String((updated.value as any)._id) };
    delete anyd._id;
    return { data: (anyd as unknown) as JobCard, error: null };
  } catch (err) {
    return { data: null, error: 'Failed to update job card' };
  }
}

export async function getJobCards(filters?: {
  status?: string;
  priority?: string;
  materialSize?: string[];
  materialType?: string[];
  enquirySize?: string[];
  quotationStatus?: string;
  overdue?: boolean;
  search?: string;
}): Promise<{ data: JobCard[]; error: string | null }> {
  try {
    const col = await getJobCardsCollection();
    const mongoQuery: any = {};

    if (filters?.status) mongoQuery.overall_status = filters.status;
    if (filters?.priority) mongoQuery.priority = filters.priority;
    if (filters?.materialSize && filters.materialSize.length > 0) mongoQuery.material_size = { $in: filters.materialSize };
    if (filters?.materialType && filters.materialType.length > 0) mongoQuery.material_type = { $in: filters.materialType };
    if (filters?.enquirySize && filters.enquirySize.length > 0) mongoQuery.enquiry_size = { $in: filters.enquirySize };
    if (filters?.quotationStatus) mongoQuery.quotation_status = filters.quotationStatus;
    if (filters?.overdue) {
      const today = new Date().toISOString().split('T')[0];
      mongoQuery.due_date = { $lt: today };
      mongoQuery.overall_status = { $ne: 'Completed' };
    }
    if (filters?.search) {
      const re = new RegExp(filters.search, 'i');
      mongoQuery.$or = [
        { job_card_number: re },
        { customer_name: re },
        { phone_number: re },
      ];
    }

    const cursor = col.find(mongoQuery).sort({ created_at: -1 });
    const data = await cursor.toArray();
    // normalize ids
    const normalized = data.map(d => {
      const anyd: any = { ...d, id: String((d as any)._id) };
      delete anyd._id;
      return (anyd as unknown) as JobCard;
    });

    return { data: normalized, error: null };
  } catch (err) {
    return { data: [], error: 'Failed to fetch job cards' };
  }
}

export async function getJobCardById(id: string): Promise<{ data: JobCard | null; error: string | null }> {
  try {
    const col = await getJobCardsCollection();
    const data = await col.findOne({ _id: new ObjectId(id) });
    if (!data) return { data: null, error: null };
    const anyd: any = { ...data, id: String((data as any)._id) };
    delete anyd._id;
    return { data: (anyd as unknown) as JobCard, error: null };
  } catch (err) {
    return { data: null, error: 'Failed to fetch job card' };
  }
}

export async function deleteJobCard(id: string): Promise<{ error: string | null }> {
  try {
    const col = await getJobCardsCollection();
    await col.deleteOne({ _id: new ObjectId(id) });
    return { error: null };
  } catch (err) {
    return { error: 'Failed to delete job card' };
  }
}

export async function getDashboardStats(): Promise<{
  activeJobs: number;
  completedJobs: number;
  overdueJobs: number;
  priorityJobs: number;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const col = await getJobCardsCollection();

    const [active, completed, overdue, priority] = await Promise.all([
      col.countDocuments({ overall_status: 'Active' }),
      col.countDocuments({ overall_status: 'Completed' }),
      col.countDocuments({ due_date: { $lt: today }, overall_status: { $ne: 'Completed' } }),
      col.countDocuments({ priority: { $in: ['High', 'Urgent'] } }),
    ]);

    return {
      activeJobs: active || 0,
      completedJobs: completed || 0,
      overdueJobs: overdue || 0,
      priorityJobs: priority || 0,
    };
  } catch (err) {
    return {
      activeJobs: 0,
      completedJobs: 0,
      overdueJobs: 0,
      priorityJobs: 0,
    };
  }
}
