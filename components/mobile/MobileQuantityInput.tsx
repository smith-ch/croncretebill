'use client'

import React from 'react'
import { Minus, Plus } from 'lucide-react'

interface MobileQuantityInputProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
}

export default function MobileQuantityInput({
    value,
    onChange,
    min = 0,
    max = 999,
    size = 'md',
    disabled = false
}: MobileQuantityInputProps) {

    const handleDecrement = () => {
        if (disabled) return
        if (value > min) {
            onChange(value - 1)
        }
    }

    const handleIncrement = () => {
        if (disabled) return
        if (value < max) {
            onChange(value + 1)
        }
    }

    const sizeClasses = {
        sm: 'h-10 text-base',
        md: 'h-14 text-xl',
        lg: 'h-16 text-2xl font-bold',
    }

    const btnClasses = {
        sm: 'w-10 px-2',
        md: 'w-14 px-3',
        lg: 'w-16 px-4',
    }

    return (
        <div className={`flex items-center justify-between border-2 rounded-2xl bg-white overflow-hidden ${disabled ? 'border-gray-200 bg-gray-50' : 'border-cyan-100 shadow-sm'
            } ${sizeClasses[size]}`}>

            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className={`h-full ${btnClasses[size]} flex items-center justify-center transition-colors touch-manipulation
          ${disabled || value <= min
                        ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 active:bg-cyan-200'
                    }`}
            >
                <Minus className={size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} />
            </button>

            <div className="flex-1 flex items-center justify-center font-semibold text-gray-800 tabular-nums">
                {value}
            </div>

            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || value >= max}
                className={`h-full ${btnClasses[size]} flex items-center justify-center transition-colors touch-manipulation
          ${disabled || value >= max
                        ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 active:bg-cyan-200'
                    }`}
            >
                <Plus className={size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} />
            </button>

        </div>
    )
}
