export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      discount_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          max_uses: number | null
          min_order_total: number | null
          owner_label: string
          public_token: string
          starts_at: string | null
          type: string
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order_total?: number | null
          owner_label: string
          public_token?: string
          starts_at?: string | null
          type: string
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order_total?: number | null
          owner_label?: string
          public_token?: string
          starts_at?: string | null
          type?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          code: string
          code_id: string
          created_at: string
          customer_name: string | null
          discount_amount: number
          id: string
          is_paid: boolean
          order_id: string | null
          receipt_number: string | null
          receipt_total: number | null
        }
        Insert: {
          code: string
          code_id: string
          created_at?: string
          customer_name?: string | null
          discount_amount: number
          id?: string
          is_paid?: boolean
          order_id?: string | null
          receipt_number?: string | null
          receipt_total?: number | null
        }
        Update: {
          code?: string
          code_id?: string
          created_at?: string
          customer_name?: string | null
          discount_amount?: number
          id?: string
          is_paid?: boolean
          order_id?: string | null
          receipt_number?: string | null
          receipt_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_code_attribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          dose: string
          id: string
          line_total: number
          name: string
          order_id: string
          quantity: number
          slug: string
          unit_price: number
        }
        Insert: {
          dose: string
          id?: string
          line_total: number
          name: string
          order_id: string
          quantity: number
          slug: string
          unit_price: number
        }
        Update: {
          dose?: string
          id?: string
          line_total?: number
          name?: string
          order_id?: string
          quantity?: number
          slug?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_city: string
          customer_name: string
          customer_note: string | null
          customer_phone: string
          discount: number
          discount_code: string | null
          discount_code_label: string | null
          id: string
          order_number: string
          paid_at: string | null
          shipping: number
          status: string
          subtotal: number
          token: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_city: string
          customer_name: string
          customer_note?: string | null
          customer_phone: string
          discount?: number
          discount_code?: string | null
          discount_code_label?: string | null
          id?: string
          order_number: string
          paid_at?: string | null
          shipping?: number
          status?: string
          subtotal: number
          token: string
          total: number
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_city?: string
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string
          discount?: number
          discount_code?: string | null
          discount_code_label?: string | null
          id?: string
          order_number?: string
          paid_at?: string | null
          shipping?: number
          status?: string
          subtotal?: number
          token?: string
          total?: number
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string
          coa_url: string | null
          created_at: string
          description: string | null
          dose: string
          featured: boolean
          form: string
          highlights: string[]
          id: string
          image: string
          is_active: boolean
          is_new: boolean
          low_stock_threshold: number
          name: string
          price: number
          purity: string
          slug: string
          sort_order: number
          stock_qty: number
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          category_id: string
          coa_url?: string | null
          created_at?: string
          description?: string | null
          dose: string
          featured?: boolean
          form: string
          highlights?: string[]
          id?: string
          image: string
          is_active?: boolean
          is_new?: boolean
          low_stock_threshold?: number
          name: string
          price?: number
          purity: string
          slug: string
          sort_order?: number
          stock_qty?: number
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string
          coa_url?: string | null
          created_at?: string
          description?: string | null
          dose?: string
          featured?: boolean
          form?: string
          highlights?: string[]
          id?: string
          image?: string
          is_active?: boolean
          is_new?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          purity?: string
          slug?: string
          sort_order?: number
          stock_qty?: number
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          product_id: string
          qty: number
          reason: string | null
          receipt_number: string | null
          reverted_at: string | null
          stock_after: number
          type: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          qty: number
          reason?: string | null
          receipt_number?: string | null
          reverted_at?: string | null
          stock_after: number
          type: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          qty?: number
          reason?: string | null
          receipt_number?: string | null
          reverted_at?: string | null
          stock_after?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      discount_code_attribution: {
        Row: {
          code: string | null
          created_at: string | null
          discount_total: number | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          min_order_total: number | null
          owner_label: string | null
          paid_redemption_count: number | null
          paid_revenue_total: number | null
          redemption_count: number | null
          revenue_total: number | null
          starts_at: string | null
          type: string | null
          used_count: number | null
          value: number | null
        }
        Relationships: []
      }
      discount_code_sales: {
        Row: {
          code_id: string | null
          id: string | null
          is_paid: boolean | null
          sale_total: number | null
          sold_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_code_attribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_overview: {
        Row: {
          created_at: string | null
          customer_city: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          id: string | null
          order_number: string | null
          products: string | null
          shipping: number | null
          status: string | null
          subtotal: number | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_discount_code_use: { Args: { p_code_id: string }; Returns: number }
      create_order: {
        Args: { payload: Json }
        Returns: {
          order_number: string
          token: string
        }[]
      }
      register_sale_stock: { Args: { payload: Json }; Returns: string }
      revert_stock_batch: { Args: { p_batch_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
