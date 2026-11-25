import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DashboardStats } from '../types/complaint';

interface ChartWidgetProps {
  stats: DashboardStats;
}

export function CategoryBarChart({ stats }: ChartWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = stats.byCategory.map((item) => item.category);
    const pendingData = stats.byCategory.map((item) => item.pending);
    const resolvedData = stats.byCategory.map((item) => item.resolved);

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Pending',
            data: pendingData,
            backgroundColor: '#D97706',
            borderRadius: 4,
            barPercentage: 0.72,
          },
          {
            label: 'Resolved',
            data: resolvedData,
            backgroundColor: '#16A34A',
            borderRadius: 4,
            barPercentage: 0.72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              color: '#475569',
              font: {
                family: '"DM Sans", sans-serif',
                size: 12,
                weight: 500,
              },
            },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { family: '"Plus Jakarta Sans", sans-serif', size: 12 },
            bodyFont: { family: '"DM Sans", sans-serif', size: 12 },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0,
              color: '#64748B',
              font: { family: '"JetBrains Mono", monospace', size: 11 },
            },
            grid: {
              color: '#F1F5F9',
            },
          },
          y: {
            stacked: true,
            ticks: {
              color: '#334155',
              font: { family: '"DM Sans", sans-serif', size: 12, weight: 500 },
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [stats]);

  return (
    <div className="relative h-72 w-full">
      <canvas ref={canvasRef} aria-label="Category-wise complaints bar chart" />
    </div>
  );
}

export function StatusDoughnutChart({ stats }: ChartWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Resolved'],
        datasets: [
          {
            data: [stats.pending, stats.resolved],
            backgroundColor: ['#D97706', '#16A34A'],
            borderColor: '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 18,
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              color: '#334155',
              font: {
                family: '"DM Sans", sans-serif',
                size: 12,
                weight: 500,
              },
            },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { family: '"Plus Jakarta Sans", sans-serif', size: 12 },
            bodyFont: { family: '"DM Sans", sans-serif', size: 12 },
            padding: 10,
            cornerRadius: 8,
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [stats]);

  return (
    <div className="relative h-56 w-full">
      <canvas ref={canvasRef} aria-label="Complaint status breakdown doughnut chart" />
    </div>
  );
}
