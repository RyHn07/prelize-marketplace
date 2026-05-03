import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getActiveInternationalShippingMethods } from "@/lib/international-shipping/queries";

export async function getActiveInternationalShippingMethodsForServer() {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const result = await getActiveInternationalShippingMethods(supabase);

    if (result.error) {
      return {
        data: [],
        error: result.error,
      };
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error("Unable to load international shipping methods."),
    };
  }
}
