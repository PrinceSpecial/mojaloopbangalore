<template>
    <DetailsModal v-model="openDetailsModal" :data="selectedRow"/>
    <UDashboardPanel id="Details">
    <template #header>
      <UDashboardNavbar title="Détails" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        
        <template #right>
          <UButton icon="i-lucide-plus" label="Télerverser le fichier" size="lg" class="rounded-full"
            @click="() => {
            formModal = true
          }" 
          />
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

      
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
   

     
        <div class="max-w-7xl mx-auto px-4 py-8">
          <div class="space-y-4 bg-default/0">
          <!-- Header with search -->
          <div class="flex items-center justify-between gap-3">
            <div class="">
              <UInput 
                v-model="globalSearch" 
                icon="i-lucide-search"
                placeholder="Rechercher"
                class="w-full"
              />
            </div>
            <div class="flex items-center gap-2">
              <UButton 
                icon="i-lucide-download"
                label="Exporter"
                color="neutral"
                variant="outline"
                @click="exportData"
              />
              <UButton
                icon="i-lucide-download"
                label="Exporter erreurs"
                color="error"
                variant="outline"
                @click="exportErrors"
              />
              <!-- <UButton
                icon="i-lucide-trash-2"
                label="Vider cache"
                color="error"
                variant="ghost"
                @click="onClearCache"
              /> -->
            </div>
          </div>

          <!-- Statistics Component -->
          <DataTableStats :data="tableData" />
      
          <!-- Table with pagination -->
          <div class="relative border border-default rounded-lg overflow-auto max-h-[65vh] bg-surface">
            <UTable
              ref="table"
              v-model:sorting="sorting"
              v-model:column-filters="columnFilters"
              v-model:pagination="pagination"
              v-model:row-selection="rowSelection"
              :data="displayedData"
              :columns="columns"
              :loading="isLoading"
              sticky="header"
              @select="onSelectRow"
              :pagination-options="paginationOptions"
              :ui="{
                base: 'table-fixed w-full border-separate border-spacing-0',
                thead: 'sticky top-0 z-20 [&>tr]:bg-surface [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0 [&>tr]:data-[selectable=true]:hover:bg-elevated/50',
                th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r px-4 py-3 text-sm font-semibold bg-surface',
                td: 'border-b border-default px-4 py-3'
              }"
            />
          </div>
      
          <!-- Pagination controls -->
          <div class="flex items-center justify-between px-4 py-3">
            <div class="text-sm text-muted">
              {{ rowSelection && Object.keys(rowSelection).length > 0 
                ? `${Object.keys(rowSelection).length} ligne(s) sélectionnée(s)` 
                : `Total: ${tableData.length} résultat(s)` }}
            </div>
            <UPagination
              :page="pagination.pageIndex + 1"
              :total="displayedData.length"
              :items-per-page="pagination.pageSize"
              @update:page="(p) => pagination.pageIndex = p - 1"
            />
          </div>
          </div>
        </div>
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import { useUploadStore } from '~/stores/useUploadStore'
import { useTransactionsStore } from '~/stores/useTransactionsStore'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import DataTableStats from '~/components/transactions/DataTableStats.vue'
import DetailsModal from '~/components/DetailsModal.vue'
const formModal = ref(false)
const UBadge = resolveComponent('UBadge')
const { isNotificationsSlideoverOpen } = useDashboard()

type ResultRow = Record<string, any>

const route = useRoute()
const fileId = String(route.params.id || '')
const uploadStore = useUploadStore()
// const txStore = useTransactionsStore()

// State
const file = computed(() => uploadStore.files.find(f => f.id === fileId))
const jobId = computed(() => file.value?.jobId)

const tableData = ref<ResultRow[]>([])
const page = ref(1)
const isLoading = ref(false)
const globalSearch = ref('')
const rowSelection = ref<Record<string, boolean>>({})

const txStore = useTransactionsStore()
const resolveTotalRows = () => {
  if (!jobId.value) return file.value?.totalRows ?? file.value?.rowCount
  return file.value?.totalRows ?? file.value?.rowCount ?? txStore.ensureJob(jobId.value, pagination.value.pageSize).totalRows
}
const updateProgressFromRows = () => {
  if (!file.value || !jobId.value) return
  const job = txStore.ensureJob(jobId.value, pagination.value.pageSize)
  const total = resolveTotalRows()
  const processed = job.rows.length
  if (total && total > 0) {
    const progress = Math.min(100, Math.round((processed / total) * 100))
    uploadStore.updateFile(file.value.id, { progress, rowCount: total, totalRows: total })
    if (processed >= total) {
      uploadStore.updateFile(file.value.id, { status: 'completed', progress: 100, rowCount: total, totalRows: total })
      txStore.markCompleted(jobId.value)
    }
  }
}

// Pagination
const pagination = ref({
  pageIndex: 0,
  pageSize: 15
})

const paginationOptions = {
  getPaginationRowModel: getPaginationRowModel()
}

// Sorting
const sorting = ref<Array<{ id: string; desc: boolean }>>([])

// Filtering
const columnFilters = ref<Array<{ id: string; value: any }>>([])

// Table reference
const table = useTemplateRef('table')

let intervalId: ReturnType<typeof setInterval> | null = null
let consecutiveEmpty = 0

// Computed: filtered data based on global search
const displayedData = computed(() => {
  if (!globalSearch.value.trim()) return tableData.value
  
  const query = globalSearch.value.toLowerCase()
  return tableData.value.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(query)
    )
  )
})

const columns: TableColumn<ResultRow>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(resolveComponent('UCheckbox'), {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
    cell: ({ row }) =>
      h(resolveComponent('UCheckbox'), {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(!!value),
        'aria-label': 'Select row'
      }),
    size: 50
  },
  {
    accessorKey: 'type_id',
    header: ({ column }) => getHeader(column, 'Type'),
    cell: ({ row }) => {
      const value = row.getValue('type_id')
      return h('span', { class: 'font-medium' }, String(value || '-'))
    }
  },
  {
    accessorKey: 'valeur_id',
    header: ({ column }) => getHeader(column, 'Valeur'),
    cell: ({ row }) => String(row.getValue('valeur_id') || '-')
  },
  {
    accessorKey: 'devise',
    header: ({ column }) => getHeader(column, 'Devise'),
    cell: ({ row }) => {
      const value = row.getValue('devise')
      return h('span', { class: 'font-semibold text-primary' }, String(value || '-'))
    }
  },
  {
    accessorKey: 'montant',
    header: ({ column }) => getHeader(column, 'Montant'),
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('montant') || '')
      return h('div', { class: 'text-right font-mono' }, amount)
    }
  },
  {
    accessorKey: 'nom_complet',
    header: ({ column }) => getHeader(column, 'Nom complet'),
    cell: ({ row }) => String(row.getValue('nom_complet') || '-')
  },
  {
    accessorKey: 'statut',
    header: ({ column }) => getHeader(column, 'Statut'),
    cell: ({ row }) => {
      const status = String(row.getValue('statut') || 'pending').toLowerCase()
      const statusMap: Record<string, { color: string; label: string }> = {
        success: { color: 'success', label: 'Succès' },
        completed: { color: 'success', label: 'Complété' },
        failed: { color: 'error', label: 'Échoué' },
        pending: { color: 'warning', label: 'En attente' },
        processing: { color: 'info', label: 'En traitement' }
      }
      const config = statusMap[status] || { color: 'neutral', label: status }
      return h(UBadge, {
        color: config.color as any,
        variant: 'subtle',
        class: 'capitalize'
      }, () => config.label)
    }
  },
  {
    accessorKey: 'error_message',
    header: ({ column }) => getHeader(column, 'Erreur'),
    size: 140,
    cell: ({ row }) => {
      const error = row.getValue('error_message')
      if (!error) return h('span', { class: 'text-muted' }, '—')

      const full = String(error)
      const truncated = full.length > 30 ? full.substring(0, 30) + '...' : full
      // Render truncated error with UTooltip
      return h(
        resolveComponent('UTooltip'),
        {
          text: full,
          side: 'top',
          ui: { base: 'max-w-xs text-xs' }
        },
        () => h('span', { class: 'text-error text-xs cursor-help' }, truncated)
      )
    }
  },
  {
    id: 'actions',
    header: () => 'Actions',
    cell: ({ row }) =>
      h('div', { class: 'flex gap-2 justify-end' }, [
        h(resolveComponent('UButton'), {
          icon: 'i-lucide-copy',
          size: 'xs',
          color: 'neutral',
          variant: 'ghost',
          onClick: () => copyRow(row.original)
        }),
        h(resolveComponent('UButton'), {
          icon: 'i-lucide-eye',
          size: 'xs',
          color: 'neutral',
          variant: 'ghost',
          onClick: () => viewRow(row.original)
        })
      ])
  }
]

// Helper: create sortable header
function getHeader(column: any, label: string) {
  const isSorted = column.getIsSorted()
  return h(resolveComponent('UButton'), {
    color: 'neutral',
    variant: 'ghost',
    label,
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
  })
}

// Action: copy row to clipboard
function copyRow(row: ResultRow) {
  const json = JSON.stringify(row, null, 2)
  navigator.clipboard.writeText(json)
  
  const toast = useToast()
  toast.add({
    title: 'Ligne copiée',
    color: 'success',
    icon: 'i-lucide-circle-check'
  })
}

const openDetailsModal = ref(false)
const selectedRow = ref<ResultRow>({})
// Action: view full row details
function viewRow(row: ResultRow) {
  openDetailsModal.value = true
  selectedRow.value = row
}

// Action: export to CSV
function exportData() {
  if (tableData.value.length === 0) {
    const toast = useToast()
    toast.add({
      title: 'Aucune donnée à exporter',
      color: 'warning'
    })
    return
  }

  const rows = tableData.value
  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h]
        const quoted = `"${String(val).replace(/"/g, '""')}"`
        return quoted
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `transactions_${fileId}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)

  const toast = useToast()
  toast.add({
    title: 'Données exportées',
    color: 'success',
    icon: 'i-lucide-circle-check'
  })
}

// Export only rows that are not success/completed
function exportErrors() {
  const rows = tableData.value.filter(r => {
    const status = String(r.statut || r.status || '').toLowerCase()
    return status !== 'success' && status !== 'completed' && status !== 'succes'
  })

  if (rows.length === 0) {
    const toast = useToast()
    toast.add({ title: 'Aucune ligne en erreur', color: 'info' })
    return
  }

  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `transactions_erreurs_${fileId}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)

  const toast = useToast()
  toast.add({
    title: 'Erreurs exportées',
    color: 'warning',
    icon: 'i-lucide-download'
  })
}

async function onClearCache() {
  if (!jobId.value) return
  const ok = confirm('Confirmer : vider le cache local pour ce job ? (les données locales seront supprimées)')
  if (!ok) return

  // clear local cache for this job
  txStore.clearJob(jobId.value)

  // reset UI table
  tableData.value = []
  pagination.value.pageIndex = 0

  // reset upload store progress/status to 0 but keep the file
  if (file.value) {
    uploadStore.updateFile(file.value.id, { progress: 0, status: 'in_progress' })
  }

  const delServer = confirm('Supprimer également les fichiers serveur (CSV + meta) ? Cela est irréversible.')
  if (delServer) {
    try {
      await $fetch(`/api/payments/delete/${jobId.value}`, { method: 'POST' })
      // notify
      const toast = useToast()
      toast.add({ title: 'Fichiers serveur supprimés', color: 'success' })
    } catch (e) {
      const toast = useToast()
      toast.add({ title: 'Erreur suppression serveur', color: 'error' })
    }
  }
}

// Action: handle row selection
function onSelectRow(e: Event, row: any) {
  row.toggleSelected(!row.getIsSelected())
}

// Polling logic
async function fetchPage() {
  if (!jobId.value) return
  try {
    isLoading.value = true
    const res = await $fetch(`/api/payments/result/${jobId.value}`, {
      params: { page: page.value }
    })
    const data = (res as any).data as ResultRow[] | undefined

    // If we don't yet know total rows, attempt to read status meta
    const jobCache = txStore.ensureJob(jobId.value, 10)
    if (!jobCache.totalRows) {
      try {
        const status = await $fetch(`/api/payments/status/${jobId.value}`)
        // @ts-ignore
        const total = status.total ?? status.totalRows ?? undefined
        if (total) txStore.setTotal(jobId.value, total)
      } catch (e) {
        // ignore
      }
    }

    if (!data || data.length === 0) {
      consecutiveEmpty++
      txStore.appendPage(jobId.value, page.value, [])
    } else {
      consecutiveEmpty = 0
      const batch = [...data].reverse()
      // update UI and store (store will dedupe / unshift)
      tableData.value.unshift(...batch)
      txStore.appendPage(jobId.value, page.value, data)
    }

    page.value++

    // Mark completed only when we reached the known total rows (if known)
    updateProgressFromRows()
    const total = resolveTotalRows()
    if (total && total > 0) {
      const job = txStore.ensureJob(jobId.value, pagination.value.pageSize)
      if (job.rows.length >= total) {
        txStore.markCompleted(jobId.value)
        if (file.value) uploadStore.updateFile(file.value.id, { status: 'completed', progress: 100, totalRows: total, rowCount: total })
        stopPolling()
      }
    }
  } catch (err) {
    console.error('fetchPage error', err)
  } finally {
    isLoading.value = false
  }
}

function startPolling() {
  // load persisted state if available
  if (jobId.value) {
    txStore.init()
    const job = txStore.ensureJob(jobId.value, 10)
    // populate tableData with cached rows
    tableData.value = [...job.rows]
    consecutiveEmpty = job.consecutiveEmpty ?? 0
    // resume from lastFetchedPage + 1
    page.value = (job.lastFetchedPage || 0) + 1
    updateProgressFromRows()
  } else {
    page.value = 1
  }

  rowSelection.value = {}
  pagination.value.pageIndex = 0

  fetchPage()
  intervalId = setInterval(() => {
    fetchPage()
  }, 3000)
}

function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  isLoading.value = false
}

// Lifecycle
onMounted(() => {
  if (typeof window !== 'undefined' && uploadStore.files.length === 0) {
    uploadStore.init()
  }

  if (jobId.value) {
    startPolling()
  } else {
    const waitForJob = setInterval(() => {
      if (jobId.value) {
        clearInterval(waitForJob)
        startPolling()
      }
    }, 500)
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style>

</style>