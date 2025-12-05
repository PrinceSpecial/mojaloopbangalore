<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisTooltip, VisBulletLegend } from '@unovis/vue'
import { Donut } from '@unovis/ts'
import { randomInt } from '~/utils'

// Function to generate realistic transaction statistics
function generateTransactionStats() {
  // Generate realistic percentages that sum to 100
  const successRate = randomInt(70, 85) // 70-85% success rate
  const failureRate = randomInt(8, 18) // 8-18% failure rate
  const pendingRate = 100 - successRate - failureRate // Remaining for pending

  return [
    {
      name: 'Réussies',
      value: successRate,
      color: '#10b981', // Emerald green for success
      count: randomInt(150, 850) // Actual transaction count
    },
    {
      name: 'Échouées',
      value: failureRate,
      color: '#ef4444', // Red for failure
      count: randomInt(10, 120) // Actual transaction count
    },
    {
      name: 'En attente',
      value: Math.max(0, pendingRate), // Ensure non-negative
      color: '#f59e0b', // Amber for pending
      count: randomInt(5, 80) // Actual transaction count
    }
  ]
}

// Simulate transaction data with realistic values
const transactionStats = ref(generateTransactionStats())

const totalTransactions = computed(() => {
  return transactionStats.value.reduce((acc, stat) => acc + (stat.count || stat.value), 0)
})

// Function to refresh data (useful for demo purposes)
function refreshData() {
  transactionStats.value = generateTransactionStats()
}

// Accessor functions for Unovis
const valueAccessor = (d: { value: number }) => d.value
const colorAccessor = (d: { color: string }) => d.color

// Tooltip triggers
const triggers = {
  [Donut.selectors.segment]: (d: { name: string; value: number; count?: number }) =>
    `<div class="p-2 rounded-md bg-background border border-gray-200 dark:border-gray-700 shadow-lg">
      <b>${d.name}</b><br/>
      <span class="text-sm">${d.value}%</span>${d.count ? `<br/><span class="text-xs text-gray-500">${d.count} transactions</span>` : ''}
    </div>`
}

// Legend items
const legendItems = computed(() => transactionStats.value.map(d => ({ name: d.name, color: d.color })))

</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-highlighted">Statistiques des Transactions</h3>
          <p class="text-sm text-gray-500">Total: {{ totalTransactions.toLocaleString() }} transactions</p>
        </div>
        <div class="flex items-center gap-4">
          <VisBulletLegend :items="legendItems" class="flex space-x-4" :style="(_: any, i: number) => ({ '--color': legendItems[i]?.color || 'gray' })" />
          <UButton 
            icon="i-lucide-refresh-cw" 
            size="xs" 
            variant="ghost" 
            @click="refreshData"
            title="Actualiser les données"
          />
        </div>
      </div>
    </template>

    <div class="flex justify-center items-center h-64">
      <VisSingleContainer :data="transactionStats" :height="250" :duration="1000">
        <VisDonut
          :value="valueAccessor"
          :color="colorAccessor"
          :arc-width="50"
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