export type JobStatus = 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
export type QuotationStatus = 'Pending' | 'Partial' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type EnquirySize = 'Small' | 'Medium' | 'Large';

export type StageKey =
  | 'drawing'
  | 'materialDocumentAndCutting'
  | 'bending'
  | 'fabrication'
  | 'coating'
  | 'dispatch';

export interface Stage {
  required: boolean;
  completed: boolean;
  completedAt: string | null;
  notes: string;
}

export interface JobCard {
  id: string;
  job_card_number: string;

  customer_name: string;
  phone_number: string;
  customer_email?: string;

  due_date: string; // ISO date string (YYYY-MM-DD)
  material_size: string;
  material_type: string;

  quotation_amount: number;
  quotation_received_amount: number;
  quotation_status: QuotationStatus;
  quotation_notes?: string;

  priority: Priority;
  overall_status: JobStatus;
  completed_at?: string;

  stages: Record<StageKey, Stage>;

  // computed metrics
  total_required_stages: number;
  completed_stages_count: number;
  progress_percentage: number;
  remaining_stages: number;
  enquiry_size?: EnquirySize;

  // audit
  created_by: string;
  last_updated_by: string;
  created_at: string;
  updated_at: string;
}
