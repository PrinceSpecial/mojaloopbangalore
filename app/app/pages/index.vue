<script setup lang="ts">
import { sub } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'

const formModal = ref(false)
const uploadedFiles = ref<Array<{ filename: string; timestamp: string; rowCount: number }>>([])

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

// Handle file upload success from child component
const onUploadSuccess = (data: { filename: string; timestamp: string; rowCount: number }) => {
  uploadedFiles.value.unshift(data)
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

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Uploaded files processing status -->
      <div v-if="uploadedFiles.length > 0" class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="(file, idx) in uploadedFiles" :key="`${file.timestamp}-${idx}`"
            class="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary-50 via-white to-accent-50 border border-primary-200 shadow-md p-5 hover:shadow-lg transition-all duration-300">
            <!-- Animated background glow -->
            <div class="absolute inset-0 bg-gradient-to-br from-primary-400/10 to-accent-400/10 blur-xl"></div>
            
            <!-- Content -->
            <div class="relative z-10">
              <!-- Header with icon -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-primary-100 rounded-lg">
                    <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-900 text-sm truncate">{{ file.filename }}</h3>
                    <p class="text-xs text-gray-500">{{ new Date(file.timestamp).toLocaleString('fr-FR') }}</p>
                  </div>
                </div>
                <!-- Pulsing indicator -->
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
                </div>
              </div>

              <!-- Status section -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-600">Statut</span>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                    <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    En cours
                  </span>
                </div>
                
                <!-- Row count -->
                <div class="flex items-center justify-between pt-2 border-t border-primary-100">
                  <span class="text-xs text-gray-600">Lignes détectées</span>
                  <span class="text-sm font-semibold text-gray-900">{{ file.rowCount }}</span>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="mt-4">
                <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full w-1/3 bg-gradient-to-r from-primary-400 to-accent-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HomeStats :period="period" :range="range" />
      <!-- <HomeChart :period="period" :range="range" /> -->
      <HomeSales :period="period" :range="range" />
    </template>
  </UDashboardPanel>
</template>
