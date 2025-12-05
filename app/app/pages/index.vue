<script setup lang="ts">
import { sub } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'
import { useUploadStore } from '~/stores/useUploadStore'
import UploadedFileCard from '~/components/File/UploadedFileCard.vue'
import TransactionStats from '@/components/home/TransactionStats.vue'
import { onMounted } from 'vue'

const formModal = ref(false)
const uploadStore = useUploadStore()
// initialize store from localStorage (client-side) inside onMounted to avoid SSR issues
onMounted(() => {
  uploadStore.init()
})

const { isNotificationsSlideoverOpen } = useDashboard()

const items = [[{
  label: 'New mail',
  icon: 'i-lucide-send',
  to: '/inbox'
}, {
  label: 'New customer',
  icon: 'i-lucide-user-plus',
  to: '/customers'
}]] satisfies DropdownMenuItem[][]

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')

// Handle file upload success from child component.
// The upload form already persists the file into the store, so avoid adding a duplicate here.
const onUploadSuccess = (data: { filename: string; timestamp: string; rowCount: number }) => {
  const ts = new Date(data.timestamp).getTime()
  const exists = uploadStore.files.some(f => f.filename === data.filename && Math.abs(f.timestamp - ts) < 2000)
  if (!exists) {
    uploadStore.addFile({ filename: data.filename, rowCount: data.rowCount, timestamp: ts, status: 'in_progress' })
  }
}
</script>

<template>
  <FileUploadForm v-model="formModal" @upload-success="onUploadSuccess" />
  <UDashboardPanel id="home" :ui="{ body: 'overflow-y-auto h-full' }">
    <template #header>
      <UDashboardNavbar title="Accueil" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        
        <template #right>
          <UButton icon="i-lucide-plus" label="Téléverser le fichier" size="lg" class="rounded-full"
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

      <!-- <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar> -->
    </template>

    <template #body>
      <div class="space-y-6 pb-6">
        <!-- Uploaded files processing status (now using store + component) -->
        <div v-if="uploadStore.files.length > 0">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UploadedFileCard v-for="file in uploadStore.files" :key="file.id" :file="file" />
          </div>
        </div>

        <TransactionStats />

        <HomeStats :period="period" :range="range" />
        <!-- <HomeChart :period="period" :range="range" /> -->
        <!-- <HomeSales :period="period" :range="range" />-->
      </div>
    </template>
  </UDashboardPanel>
</template>
