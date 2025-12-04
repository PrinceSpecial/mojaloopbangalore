<script setup lang="ts">
import { sub } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'
import { useUploadStore } from '~/stores/useUploadStore'
import UploadedFileCard from '~/components/File/UploadedFileCard.vue'
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

// Handle file upload success from child component and persist in store
const onUploadSuccess = (data: { filename: string; timestamp: string; rowCount: number }) => {
  uploadStore.addFile({ filename: data.filename, rowCount: data.rowCount, timestamp: new Date(data.timestamp).getTime(), status: 'in_progress' })
}
</script>

<template>
  <FileUploadForm v-model="formModal" @upload-success="onUploadSuccess" />
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Accueil" :ui="{ right: 'gap-3' }">
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

      <!-- <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar> -->
    </template>

    <template #body>
      <!-- Uploaded files processing status (now using store + component) -->
      <div v-if="uploadStore.files.length > 0" class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UploadedFileCard v-for="file in uploadStore.files" :key="file.id" :file="file" />
        </div>
      </div>

      <HomeStats :period="period" :range="range" />
      <!-- <HomeChart :period="period" :range="range" /> -->
      <HomeSales :period="period" :range="range" />
    </template>
  </UDashboardPanel>
</template>
