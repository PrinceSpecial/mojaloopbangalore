<template>
  <UModal v-model:open="model" :ui="{ content: 'max-w-2xl p-5' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="text-xl font-semibold">Détails de la transaction</h2>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="model = false" />
      </div>
    </template>

    <template #content>
      <div class="space-y-4">
        <!-- Error Message Section - Highlighted in Red -->
        <div v-if="hasError" class="bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-alert-circle" class="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div class="flex-1">
              <h3 class="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">Message d'erreur</h3>
              <p class="text-red-800 dark:text-red-300 font-medium">{{ errorMessage }}</p>
            </div>
          </div>
        </div>

        <!-- Status Badge -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted">Statut:</span>
          <UBadge 
            :color="statusColor" 
            variant="subtle" 
            class="capitalize"
          >
            {{ displayStatus }}
          </UBadge>
        </div>

        <!-- Data Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="(value, key) in displayData" :key="key" class="bg-elevated/50 rounded-lg p-3 border border-default">
            <div class="text-xs font-medium text-muted uppercase mb-1">{{ formatLabel(key) }}</div>
            <div class="text-sm font-semibold text-highlighted wrap-break-word">
              {{ formatValue(key, value) }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

const model = defineModel({ type: Boolean })
type ResultRow = Record<string, any>
const props = defineProps<{
  data: ResultRow
}>()

const showRawJson = ref(false)

// Check if there's an error
const hasError = computed(() => {
  const errorMsg = props.data.error_message || props.data.errorMessage || ''
  return String(errorMsg).trim().length > 0
})

const errorMessage = computed(() => {
  return props.data.error_message || props.data.errorMessage || ''
})

// Status display
const displayStatus = computed(() => {
  const status = String(props.data.statut || props.data.status || 'inconnu').toLowerCase()
  const statusMap: Record<string, string> = {
    'success': 'Réussi',
    'succes': 'Réussi',
    'completed': 'Complété',
    'failed': 'Échoué',
    'echoue': 'Échoué',
    'pending': 'En attente',
    'processing': 'En traitement'
  }
  return statusMap[status] || status
})

const statusColor = computed(() => {
  const status = String(props.data.statut || props.data.status || '').toLowerCase()
  if (status === 'success' || status === 'succes' || status === 'completed') return 'success'
  if (status === 'failed' || status === 'echoue') return 'error'
  if (status === 'pending' || status === 'processing') return 'warning'
  return 'neutral'
})

// Filter and format data for display (exclude error_message as it's shown separately)
const displayData = computed(() => {
  const excluded = ['error_message', 'errorMessage', 'id']
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(props.data)) {
    if (!excluded.includes(key) && value !== null && value !== undefined) {
      result[key] = value
    }
  }
  
  return result
})

// Format field labels
function formatLabel(key: string): string {
  const labels: Record<string, string> = {
    'type_id': 'Type d\'identité',
    'valeur_id': 'Valeur d\'identité',
    'devise': 'Devise',
    'montant': 'Montant',
    'nom_complet': 'Nom complet',
    'statut': 'Statut',
    'status': 'Statut'
  }
  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Format values
function formatValue(key: string, value: any): string {
  if (key === 'montant' && typeof value === 'number') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(value)
  }
  return String(value)
}

// Formatted JSON for raw view
const formattedJson = computed(() => {
  return JSON.stringify(props.data, null, 2)
})
</script>

<style scoped>
pre {
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>