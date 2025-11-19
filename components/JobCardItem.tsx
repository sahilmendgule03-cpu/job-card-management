"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { JobCard } from "@/models/job-card";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { Calendar, Clock, Phone, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type JobCardItemProps = {
  jobCard: JobCard;
};

const priorityColors = {
  Low: "border-l-4 border-l-blue-600",
  Medium: "border-l-4 border-l-green-600",
  High: "border-l-4 border-l-yellow-600",
  Urgent: "border-l-4 border-l-red-600",
};

const statusColors = {
  Active: "bg-blue-600 text-white",
  Completed: "bg-green-600 text-white",
  "On Hold": "bg-gray-500 text-white",
  Cancelled: "bg-red-600 text-white",
};

export function JobCardItem({ jobCard }: JobCardItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const isOverdue =
    isPast(parseISO(jobCard.due_date)) &&
    jobCard.overall_status !== "Completed";
  const dueDate = parseISO(jobCard.due_date);
  const formattedDueDate = format(dueDate, "MMM dd, yyyy");

  const stageKeys = Object.keys(jobCard.stages) as Array<
    keyof JobCard["stages"]
  >;
  const requiredStages = stageKeys.filter(
    (key) => jobCard.stages[key].required
  );

  const completedStages = requiredStages.filter(
    (key) => jobCard.stages[key].completed
  ).length;
  const progressPercentage = Math.round(
    (completedStages / requiredStages.length) * 100
  );

  return (
    <Link href={`/dashboard/job-cards/${jobCard.id}`} className="block h-full">
      <Card
        className={`hover:shadow-lg transition-all duration-200 h-full flex flex-col ${
          priorityColors[jobCard.priority]
        }`}
      >
        {/* Header */}
        <CardHeader className="pb-2 pt-2 px-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-md">
          <div className="p-2 flex flex-col justify-between w-full">
            <div className="text-lg text-gray-700 font-bold text-base truncate">
              {jobCard.customer_name}
            </div>
            <div className="flex flex-row justify-between gap-2">
              <h3 className="text-gray-900">
                {jobCard.job_card_number}
              </h3>
              <Badge
                className={`${
                  statusColors[jobCard.overall_status]
                } px-2 py-0.5 text-xs font-medium`}
              >
                {jobCard.overall_status}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{jobCard.phone_number}</span>
          </div>

          <button
            onClick={toggleExpand}
            className="ml-auto mt-1 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={isExpanded ? "Show less" : "Show more"}
          >
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 flex flex-col p-4 pt-0">
          {/* Compact View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Wrench className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {jobCard.material_size} {jobCard.material_type}
                </span>
              </div>
              <div className="text-sm font-medium">{progressPercentage}%</div>
            </div>

            <Progress value={progressPercentage} className="h-2 bg-gray-100" />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {formattedDueDate}
                </span>
              </div>
              {jobCard.quotation_amount > 0 && (
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={
                      jobCard.quotation_status === 'Completed' ? 'border-green-200 bg-green-50 text-green-700' :
                      jobCard.quotation_status === 'Partial' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                      'border-gray-200 bg-gray-50 text-gray-700'
                    }
                  >
                    {jobCard.quotation_status}
                  </Badge>
                  <span className="font-medium">
                    ₹{jobCard.quotation_amount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expanded View */}
          {isExpanded && (
            <div className="mt-4 pt-3 border-t space-y-3">
              {/* Stages Progress */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Progress by Stage
                </h4>
                {requiredStages.map((stage) => {
                  const isCompleted = jobCard.stages[stage].completed;
                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="capitalize">
                          {stage.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <Badge
                          variant={isCompleted ? "default" : "outline"}
                          className={`text-xs ${
                            isCompleted
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-50"
                          }`}
                        >
                          {isCompleted ? "Done" : "Pending"}
                        </Badge>
                      </div>
                      <Progress
                        value={isCompleted ? 100 : 0}
                        className={`h-1.5 ${
                          isCompleted ? "bg-green-200" : "bg-gray-100"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Additional Info */}
              <div className="text-sm space-y-1">
                {jobCard.enquiry_size && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enquiry Size:</span>
                    <Badge variant="outline" className="text-xs">
                      {jobCard.enquiry_size}
                    </Badge>
                  </div>
                )}
                {jobCard.quotation_amount > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <Badge 
                        variant="outline" 
                        className={
                          jobCard.quotation_status === 'Completed' ? 'border-green-200 bg-green-50 text-green-700' :
                          jobCard.quotation_status === 'Partial' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                          'border-gray-200 bg-gray-50 text-gray-700'
                        }
                      >
                        {jobCard.quotation_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Received:</span>
                      <span className="font-medium">
                        ₹{jobCard.quotation_received_amount?.toLocaleString('en-IN') || '0'}
                      </span>
                    </div>
                    {jobCard.quotation_status === 'Partial' && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium text-amber-700">
                          ₹{(jobCard.quotation_amount - (jobCard.quotation_received_amount || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Stages:</span>
                  <span className="font-medium">
                    {completedStages} of {requiredStages.length} completed
                  </span>
                </div>

                {/* Overdue Info */}
                {isOverdue && (
                  <div className="text-red-600 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Overdue by{" "}
                      {formatDistanceToNow(dueDate, { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
