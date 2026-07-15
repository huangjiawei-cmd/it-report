export interface QiyuRaw {
  total: number;
  valid: number;
  invalid: number;
  unreplied: number;
  avg_first_reply: number;
  avg_reply: number;
  avg_session_duration?: number;
  reply_30s_pct?: number;
  answer_to_question_ratio?: number;
  relative_satisfaction?: number;
}

export interface BohBrandDetails {
  堂食: number;
  外卖: number;
  营销活动: number;
}

export interface BohData {
  "太二": BohBrandDetails;
  "九毛九": BohBrandDetails;
  "怂": BohBrandDetails;
}

export interface SupplierEfficiency {
  count: number;
  days: number;
}

export interface SupplierSplits {
  haiv: SupplierEfficiency;
  qing: SupplierEfficiency;
  dvs: SupplierEfficiency;
}

export interface SystemUser {
  id: string;
  username: string;
  password: string;
  role: "管理员" | "撰写人";
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
}

export interface ReportMetrics {
  prev_month_label: string;
  curr_month_label: string;
  curr_boh_total: number;
  prev_boh_total: number;
  current_month_tickets_total: number;
  compare_month_tickets_total: number;
  current_month_avg_days: number;
  compare_month_avg_days: number;
  compare_month_qiyu_valid: number;
  current_qiyu_raw: QiyuRaw;
  compare_qiyu_raw: QiyuRaw;
  current_categories: Record<string, number>;
  compare_categories: Record<string, number>;
  curr_boh_data: BohData;
  prev_boh_data: BohData;
  ticket_brand_distribution: Record<string, number>;
  ticket_cate_distribution: Record<string, number>;
  ticket_shop_ranking: Record<string, number>;
  supplier_splits: SupplierSplits;
  current_renwood_count: number;
  current_new_shops: number;
  compare_month_renovation_count: number;
  compare_month_new_shops: number;
  curr_backup_4g: number;
  prev_backup_4g: number;
  curr_dingtalk_sessions: number;
  prev_dingtalk_sessions: number;
}
