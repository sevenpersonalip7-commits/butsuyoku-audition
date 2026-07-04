// supabaseClient.js
// ビルドステップなしで使うため、esm.sh経由でCDNからSupabase SDKを読み込む
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ⚠️ ここにSupabaseダッシュボード > Project Settings > API から取得した値を入れる
// anon keyは「公開されても良い」設計のキー（RLSで保護されるため）だが、
// service_role keyは絶対にフロントに書かない・公開リポジトリに含めないこと
const SUPABASE_URL = "https://vivxrbmnzcxfjnvwxqcb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdnhyYm1uemN4Zmpudnd4cWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzE3OTQsImV4cCI6MjA5ODc0Nzc5NH0.Sae1iWk6bUR5hHEn2ZPFNVrlk4wNQZ-iVv0IJCWMqlc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});