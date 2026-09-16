from pathlib import Path


def replace_exact(text, old, new, label, expected=1):
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{label}: expected {expected}, found {count}')
    return text.replace(old, new)

# Domain type
p = Path('src/types/Complaint.ts')
t = p.read_text(encoding='utf-8')
t = replace_exact(
    t,
    "  previousBillAmount?: number | null;\n  incidentDate?: string | null;",
    "  previousBillAmount?: number | null;\n  briberyDepartment?: string | null;\n  briberyService?: string | null;\n  briberyAmount?: number | null;\n  incidentDate?: string | null;",
    'complaint domain bribery fields',
)
p.write_text(t, encoding='utf-8')

# Supabase row + mapper
p = Path('src/services/api/supabaseComplaintService.ts')
t = p.read_text(encoding='utf-8')
t = replace_exact(
    t,
    "  previous_bill_amount?: number | null;\n  created_at: string;",
    "  previous_bill_amount?: number | null;\n  bribery_department?: string | null;\n  bribery_service?: string | null;\n  bribery_amount?: number | null;\n  created_at: string;",
    'supabase row bribery fields',
)
t = replace_exact(
    t,
    "    previousBillAmount:\n      row.previous_bill_amount !== null && row.previous_bill_amount !== undefined\n        ? Number(row.previous_bill_amount)\n        : null,\n    incidentDate:",
    "    previousBillAmount:\n      row.previous_bill_amount !== null && row.previous_bill_amount !== undefined\n        ? Number(row.previous_bill_amount)\n        : null,\n    briberyDepartment: row.bribery_department ?? null,\n    briberyService: row.bribery_service ?? null,\n    briberyAmount:\n      row.bribery_amount !== null && row.bribery_amount !== undefined\n        ? Number(row.bribery_amount)\n        : null,\n    incidentDate:",
    'supabase mapper bribery fields',
)
p.write_text(t, encoding='utf-8')

# Admin detail UI
p = Path('src/components/complaints/ComplaintInfoSection.tsx')
t = p.read_text(encoding='utf-8')
t = replace_exact(
    t,
    "import { cn } from '@/utils';",
    "import { cn } from '@/utils';\nimport { getBriberyDepartmentLabel } from '@/utils/briberyDepartment';",
    'admin bribery label import',
)
t = replace_exact(
    t,
    "  const isBn = language === 'bn';",
    "  const isBn = language === 'bn';\n  const isBriberyReport =\n    complaint.categoryId === 'extortion' && complaint.subcategoryId === 'bribe-demanded-service';\n  const hasBriberyDetails = Boolean(\n    complaint.briberyDepartment ||\n      complaint.briberyService ||\n      (complaint.briberyAmount !== null && complaint.briberyAmount !== undefined)\n  );",
    'admin bribery flags',
)
anchor = """      {/* Harassment Classification Context (read-only citizen-submitted metadata) */}
"""
insert = """      {isBriberyReport && hasBriberyDetails && (
        <Card variant=\"default\">
          <CardHeader className=\"border-b border-slate-100 dark:border-slate-800 pb-3\">
            <CardTitle className=\"text-sm font-semibold flex items-center gap-2\">
              <Layers className=\"w-4 h-4 text-amber-600 dark:text-amber-400\" />
              <span>{isBn ? 'ঘুষ সংক্রান্ত তথ্য' : 'Bribery Details'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className=\"pt-4\">
            <div className=\"grid grid-cols-1 sm:grid-cols-3 gap-4\">
              {complaint.briberyDepartment && (
                <div className=\"space-y-1\">
                  <p className=\"text-xs text-slate-500 dark:text-slate-400\">{isBn ? 'দপ্তর' : 'Department'}</p>
                  <p className=\"text-sm font-medium text-slate-900 dark:text-slate-100\">
                    {getBriberyDepartmentLabel(complaint.briberyDepartment, isBn ? 'bn' : 'en')}
                  </p>
                </div>
              )}
              {complaint.briberyService && (
                <div className=\"space-y-1\">
                  <p className=\"text-xs text-slate-500 dark:text-slate-400\">{isBn ? 'সেবা বা প্রক্রিয়া' : 'Service or Process'}</p>
                  <p className=\"text-sm font-medium text-slate-900 dark:text-slate-100\">{complaint.briberyService}</p>
                </div>
              )}
              {complaint.briberyAmount !== null && complaint.briberyAmount !== undefined && (
                <div className=\"space-y-1\">
                  <p className=\"text-xs text-slate-500 dark:text-slate-400\">{isBn ? 'টাকার পরিমাণ' : 'Amount (BDT)'}</p>
                  <p className=\"text-sm font-medium text-slate-900 dark:text-slate-100\">৳{complaint.briberyAmount.toLocaleString()}</p>
                </div>
              )}
            </div>
            <p className=\"mt-3 text-[11px] text-slate-400 dark:text-slate-500\">
              {isBn ? 'নাগরিকের জমা দেওয়া ঘুষ-সংক্রান্ত কাঠামোবদ্ধ তথ্য।' : 'Structured bribery information submitted by the citizen.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Harassment Classification Context (read-only citizen-submitted metadata) */}
"""
t = replace_exact(t, anchor, insert, 'admin bribery details card')
p.write_text(t, encoding='utf-8')

print('Admin bribery contract patch applied.')
