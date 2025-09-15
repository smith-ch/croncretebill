"use client"

import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface RevenueChartProps {
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
      fill?: boolean
    }>
  }
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 'bold' as const,
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: '#f3f4f6',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          callback: (value: any) => `$${value.toLocaleString()}`,
        },
      },
    },
    elements: {
      point: {
        radius: 6,
        hoverRadius: 8,
        borderWidth: 3,
      },
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
  }

  return (
    <div className="h-80 w-full">
      <Line options={options} data={data} />
    </div>
  )
}

interface ExpenseChartProps {
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      backgroundColor: string[]
      borderColor: string[]
      borderWidth: number
    }>
  }
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ data }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((context.parsed / total) * 100).toFixed(1)
            return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`
          },
        },
      },
    },
    cutout: '65%',
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
  }

  return (
    <div className="h-80 w-full">
      <Doughnut options={options} data={data} />
    </div>
  )
}

interface ComparisonChartProps {
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      backgroundColor: string
      borderColor: string
      borderWidth: number
    }>
  }
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ data }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'rect',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 'bold' as const,
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: '#f3f4f6',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          callback: (value: any) => `$${value.toLocaleString()}`,
        },
      },
    },
    borderRadius: 8,
    borderSkipped: false,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
  }

  return (
    <div className="h-80 w-full">
      <Bar options={options} data={data} />
    </div>
  )
}

interface AnimatedCounterProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  end,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [count, setCount] = React.useState(0)
  const countRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp
      }
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentCount = Math.floor(easeOutQuart * end)
      
      setCount(currentCount)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [end, duration])

  return (
    <span ref={countRef} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}