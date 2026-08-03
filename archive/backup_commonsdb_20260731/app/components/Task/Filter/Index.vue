<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ListFilter } from 'lucide-vue-next';

export interface FilterItem {

}

interface TaskFilterProps {
  field: string;
  label: string;
  menuLabel?: string;
  items: {
    label: string;
    value: string
  }[]
}
const { field, items } = defineProps<TaskFilterProps>()
const emit = defineEmits(["filter:changed"]);

const { appliedFilter } = useQueryFilter();
const data: Ref<{ [key: string]: boolean }> = ref(
  items.reduce((x, i) => {
    let checked = false;

    if (field in appliedFilter.value) {
      checked = (appliedFilter.value[field] as Array<string>).includes(i.value);
    }

    return { ...x, [i.value]: checked }
  }, {})
);
const appliedValues = computed(() =>
  Object.keys(data.value).map((key) => ({ value: key, checked: data.value[key] })).filter(x => x.checked).map(x => x.value)
)

const onChange = (val: string, checked: boolean) => {
  if (val in data.value) {
    data.value[val] = checked
    emit('filter:changed', appliedValues.value)
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :class="['h-7 gap-1 rounded-md px-3']">
        <ListFilter class="size-3.5" />
        <span>{{ label }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>{{ menuLabel ?? 'Filter by' }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <form>
        <DropdownMenuItem v-for="item in items">
          <div class="items-top flex space-x-2">
            <Checkbox :id="item.value" :value="item.value" :checked="data[item.value] ?? false"
              @update:checked="(checked) => onChange(item.value, checked)" />
            <label :for="item.value"
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {{ item.label }}
            </label>
          </div>
        </DropdownMenuItem>
      </form>
    </DropdownMenuContent>
  </DropdownMenu>
</template>