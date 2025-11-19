'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { JobCard } from '@/models/job-card';
import { useState } from 'react';

type CreateJobCardFormProps = {
  userId: string;
  onSuccess: () => void;
};

export default function CreateJobCardForm({ userId, onSuccess }: CreateJobCardFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    phone_number: '',
    customer_email: '',
    due_date: '',
    material_size: '3mm',
    material_type: 'Steel',
    quotation_amount: '',
    quotation_status: 'Pending' as const,
    quotation_notes: '',
    priority: 'Medium' as const,
  });

  const [stages, setStages] = useState({
    drawing: { required: false, completed: false, completedAt: null, notes: '' },
    materialDocumentAndCutting: { required: false, completed: false, completedAt: null, notes: '' },
    bending: { required: false, completed: false, completedAt: null, notes: '' },
    fabrication: { required: false, completed: false, completedAt: null, notes: '' },
    coating: { required: false, completed: false, completedAt: null, notes: '' },
    dispatch: { required: false, completed: false, completedAt: null, notes: '' },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const requiredStagesCount = Object.values(stages).filter(s => s.required).length;
    if (requiredStagesCount === 0) {
      alert('Please select at least one required stage');
      setLoading(false);
      return;
    }

    const jobCardData: Partial<JobCard> = {
      ...formData,
      quotation_amount: formData.quotation_amount ? parseFloat(formData.quotation_amount) : undefined,
      stages,
      overall_status: 'Active',
    };

    try {
      const res = await fetch('/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...jobCardData, userId }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        alert('Error creating job card: ' + (json?.error || res.statusText));
      } else {
        onSuccess();
      }
    } catch (err) {
      alert('Error creating job card');
    }

    setLoading(false);
  };

  const toggleStage = (stageName: keyof typeof stages) => {
    setStages(prev => ({
      ...prev,
      [stageName]: {
        ...prev[stageName],
        required: !prev[stageName].required,
      },
    }));
  };

  const stageLabels = {
    drawing: 'Drawing',
    materialDocumentAndCutting: 'Material Document & Cutting',
    bending: 'Bending',
    fabrication: 'Fabrication',
    coating: 'Coating',
    dispatch: 'Dispatch',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer_name">Customer Name *</Label>
          <Input
            id="customer_name"
            value={formData.customer_name}
            onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
            required
            placeholder="Enter customer name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone Number *</Label>
          <Input
            id="phone_number"
            value={formData.phone_number}
            onChange={e => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
            required
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_email">Email (Optional)</Label>
          <Input
            id="customer_email"
            type="email"
            value={formData.customer_email}
            onChange={e => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
            placeholder="customer@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="material_size">Material Size *</Label>
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
          <Label htmlFor="material_type">Material Type *</Label>
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

        <div className="space-y-2">
          <Label htmlFor="quotation_amount">Quotation Amount (₹)</Label>
          <Input
            id="quotation_amount"
            type="number"
            step="0.01"
            value={formData.quotation_amount}
            onChange={e => setFormData(prev => ({ ...prev, quotation_amount: e.target.value }))}
            placeholder="50000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority *</Label>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="quotation_notes">Quotation Notes</Label>
        <Textarea
          id="quotation_notes"
          value={formData.quotation_notes}
          onChange={e => setFormData(prev => ({ ...prev, quotation_notes: e.target.value }))}
          placeholder="Add any notes about the quotation..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Required Stages * (Select at least one)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg">
          {Object.entries(stageLabels).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`stage-${key}`}
                checked={stages[key as keyof typeof stages].required}
                onCheckedChange={() => toggleStage(key as keyof typeof stages)}
              />
              <label htmlFor={`stage-${key}`} className="text-sm cursor-pointer">
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Job Card'}
        </Button>
      </div>
    </form>
  );
}
