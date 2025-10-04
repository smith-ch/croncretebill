-- Crear tabla product_categories si no existe
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_category_name_per_user UNIQUE(user_id, name)
);

-- Crear índices para product_categories
CREATE INDEX IF NOT EXISTS idx_product_categories_user_id ON public.product_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON public.product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON public.product_categories(is_active);

-- Habilitar RLS en product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para product_categories
DROP POLICY IF EXISTS "Users can view their own product categories" ON public.product_categories;
CREATE POLICY "Users can view their own product categories" ON public.product_categories
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own product categories" ON public.product_categories
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own product categories" ON public.product_categories
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own product categories" ON public.product_categories
    FOR DELETE USING (user_id = auth.uid());

-- Agregar categoria_id a products si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
    END IF;
END $$;