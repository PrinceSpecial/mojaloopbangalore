<script setup lang="ts">
import { computed } from 'vue'
import { useUploadStore } from '~/stores/useUploadStore'
import { useTransactionsStore } from '~/stores/useTransactionsStore'
import { useRouter } from 'vue-router'

interface FileItem {
  id: string
  filename: string
  timestamp: number
  rowCount: number
  status: string
  progress?: number
  jobId?: string
}

const props = withDefaults(defineProps<{
  file: FileItem
  // optional overrides for status color classes
  statusColors?: Record<string, any>
}>(), {
  statusColors: undefined
})

const router = useRouter()
const uploadStore = useUploadStore()
const txStore = useTransactionsStore()

const defaultColors = {
  in_progress: {
    bgFrom: 'from-primary-50',
    bgTo: 'to-accent-50',
    border: 'border-primary-200',
    badgeBg: 'bg-primary-100',
    badgeText: 'text-primary-700',
    progressFrom: 'from-primary-400',
    progressTo: 'to-accent-400'
  },
  completed: {
    bgFrom: 'from-blue-50',
    bgTo: 'to-sky-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    progressFrom: 'from-blue-500',
    progressTo: 'to-sky-500'
  },
  failed: {
    bgFrom: 'from-red-50',
    bgTo: 'to-rose-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    progressFrom: 'from-red-500',
    progressTo: 'to-rose-500'
  },
  unknown: {
    bgFrom: 'from-gray-50',
    bgTo: 'to-gray-100',
    border: 'border-gray-200',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    progressFrom: 'from-gray-400',
    progressTo: 'to-gray-500'
  }
}

const colors = computed(() => {
  const key = (props.file.status || 'in_progress') as keyof typeof defaultColors
  return { ...(defaultColors[key] ?? defaultColors.unknown), ...(props.statusColors?.[key] ?? {}) }
})

function go() {
  router.push(`/transactions/${props.file.id}`)
}

async function onClearCache() {
  const ok = confirm('Confirmer : vider le cache local pour ce job ?')
  if (!ok) return

  // clear tx cache and reset progress
  txStore.clearJob(props.file.jobId ?? props.file.id)
  uploadStore.updateFile(props.file.id, { progress: 0, status: 'in_progress' })

  const delServer = confirm('Supprimer aussi les fichiers serveur (CSV + meta) ?')
  if (delServer && props.file.jobId) {
    try {
      await $fetch(`/api/payments/delete/${props.file.jobId}`, { method: 'POST' })
      const toast = useToast()
      toast.add({ title: 'Fichiers serveur supprimés', color: 'success' })
    } catch (e) {
      const toast = useToast()
      toast.add({ title: 'Erreur suppression serveur', color: 'error' })
    }
  }
}
</script>

<template>
  <div @click="go" role="button" tabindex="0"
    class="relative overflow-hidden rounded-lg shadow-md p-5 hover:shadow-lg transition-all duration-300 cursor-pointer"
    :class="[`bg-gradient-to-br`, colors.bgFrom, colors.bgTo, colors.border]">

    <div class="absolute inset-0" :class="`bg-gradient-to-br ${colors.bgFrom}/10 ${colors.bgTo}/10 blur-xl`"></div>

    <div class="relative z-10">
        <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg" :class="colors.badgeBg">
            <svg class="w-5 h-5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 text-sm truncate">{{ file.filename }}</h3>
            <p class="text-xs text-gray-500">{{ new Date(file.timestamp).toLocaleString('fr-FR') }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full animate-pulse" :class="{
            'bg-primary-500': file.status === 'in_progress',
            'bg-blue-600': file.status === 'completed',
            'bg-red-600': file.status === 'failed'
          }"></span>
          <button @click.stop="onClearCache" title="Vider cache" class="ml-2 p-1 rounded hover:bg-gray-100">
            <svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-600">Statut</span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1" :class="[colors.badgeBg, colors.badgeText, 'text-xs', 'font-medium', 'rounded-full']">
            <svg v-if="file.status === 'in_progress'" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <svg v-else-if="file.status === 'completed'" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 5.707 10.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11V5a1 1 0 10-2 0v4a1 1 0 00.293.707l2 2a1 1 0 101.414-1.414L11 7z" clip-rule="evenodd" />
            </svg>
            <span class="capitalize">{{ file.status === 'in_progress' ? 'En cours' : (file.status === 'completed' ? 'Terminé' : 'Échoué') }}</span>
          </span>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-primary-100">
          <span class="text-xs text-gray-600">Lignes détectées</span>
          <span class="text-sm font-semibold text-gray-900">{{ file.rowCount }}</span>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-600">Progress</span>
          <span class="text-xs font-medium text-gray-700">{{ file.progress ?? 0 }}%</span>
        </div>
        <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full rounded-full" :class="[`bg-gradient-to-r`, colors.progressFrom, colors.progressTo]" :style="{ width: (file.progress ?? 0) + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* allow text-current to pick up badge color if needed */
.text-current { color: inherit; }
</style>
