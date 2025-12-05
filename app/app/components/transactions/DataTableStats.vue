<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisTooltip, VisBulletLegend } from '@unovis/vue'
import { Donut } from '@unovis/ts'

interface Props {
  data: Array<Record<string, any>>
}

const props = defineProps<Props>()

// Calculate statistics from table data
const stats = computed(() => {
  const total = props.data.length
  if (total === 0) {
    return {
      success: { count: 0, percentage: 0 },
      pending: { count: 0, percentage: 0 },
      failed: { count: 0, percentage: 0 },
      total: 0
    }
  }

  const successCount = props.data.filter(row => {
    const status = String(row.statut || '').toLowerCase()
    return status === 'success' || status === 'succes' || status === 'completed'
  }).length

  const failedCount = props.data.filter(row => {
    const status = String(row.statut || '').toLowerCase()
    return status === 'failed' || status === 'echoue' || status === 'échec'
  }).length

  const pendingCount = total - successCount - failedCount

  return {
    success: {
      count: successCount,
      percentage: total > 0 ? Math.round((successCount / total) * 100) : 0
    },
    pending: {
      count: pendingCount,
      percentage: total > 0 ? Math.round((pendingCount / total) * 100) : 0
    },
    failed: {
      count: failedCount,
      percentage: total > 0 ? Math.round((failedCount / total) * 100) : 0
    },
    total
  }
})

// Format data for pie chart
const chartData = computed(() => {
  const data = []
  
  if (stats.value.success.count > 0) {
    data.push({
      name: 'Réussies',
      value: stats.value.success.percentage,
      count: stats.value.success.count,
      color: '#10b981' // Emerald green
    })
  }
  
  if (stats.value.pending.count > 0) {
    data.push({
      name: 'En attente',
      value: stats.value.pending.percentage,
      count: stats.value.pending.count,
      color: '#f59e0b' // Amber
    })
  }
  
  if (stats.value.failed.count > 0) {
    data.push({
      name: 'Échouées',
      value: stats.value.failed.percentage,
      count: stats.value.failed.count,
      color: '#ef4444' // Red
    })
  }

  // If no data, show empty state
  if (data.length === 0) {
    return [{
      name: 'Aucune donnée',
      value: 100,
      count: 0,
      color: '#9ca3af' // Gray
    }]
  }

  return data
})

// Accessor functions for Unovis
const valueAccessor = (d: { value: number }) => d.value
const colorAccessor = (d: { color: string }) => d.color
const labelAccessor = (d: { name?: string }) => d.name || '—'

// Tooltip triggers
const triggers = {
  [Donut.selectors.segment]: (d: { name: string; value: number; count?: number }) =>
    `<div class="p-2 rounded-md bg-background border border-gray-200 dark:border-gray-700 shadow-lg">
      <b>${d.name}</b><br/>
      <span class="text-sm">${d.value}%</span>${d.count !== undefined ? `<br/><span class="text-xs text-gray-500">${d.count} transaction(s)</span>` : ''}
    </div>`
}

// Legend items
const legendItems = computed(() => chartData.value.map(d => ({ name: d.name, color: d.color })))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-highlighted">Statistiques des Transactions</h3>
          <p class="text-sm text-gray-500">Total: {{ stats.total.toLocaleString() }} transaction(s)</p>
        </div>
        <div class="flex items-center gap-4">
          <VisBulletLegend :items="legendItems" class="flex space-x-4" :style="(_: any, i: number) => ({ '--color': legendItems[i]?.color || 'gray' })" />
        </div>
      </div>
    </template>

    <div class="flex justify-center items-center h-64">
      <VisSingleContainer :data="chartData" :height="250" :duration="1000">
        <VisDonut
          :value="valueAccessor"
          :color="colorAccessor"
          :label="labelAccessor"
          :arc-width="120"
          :pad-angle="0.02"
          :cornerRadius="5"
        />
        <VisTooltip :triggers="triggers" />
      </VisSingleContainer>
    </div>
  </UCard>
</template>

<style scoped>
/* Custom styles for legend items to add a color indicator */
:deep(.vis-legend-item) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.vis-legend-item::before) {
  content: '';
  display: block;
  width: 0.75rem; /* 12px */
  height: 0.75rem; /* 12px */
  border-radius: 50%;
  background-color: var(--color);
}
</style>

