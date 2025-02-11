<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod';
import { type Organization } from '@prisma/client'
import { toast } from '~/components/ui/toast';

interface OrganizationFormProps {
    organization?: Organization
    loading?: boolean,
}
const { organization } = defineProps<OrganizationFormProps>()
const emit = defineEmits(['submit', 'cancel'])

const schema = toTypedSchema(
    z.object({
        id: z.string().uuid().optional(),
        name: z.string(),
        bio: z.string().nullable().optional(),
        code: z.string().nullable().optional(),
        members: z.array(z.object({
            user: z.object({
                id: z.string(),
                username: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
            }),
            role: z.string()
        })).nullable().optional()
    })
)

const { data: code } = await useFetch('/api/admin/organizations/get-unique-code')
const { values, setFieldValue, handleSubmit } = useForm({
    validationSchema: schema,
    initialValues: {
        code: code.value,
        ...organization,
    }
})

const onSubmit = handleSubmit(async (values, props) => {
    const { id, members, ...organizationData } = values;

    try {
        const body = {
            members: members?.map(m => ({
                userId: m.user.id,
                role: m.role
            })),
            ...organizationData
        }

        if (id) {
            await useFetch<Organization>(`/api/admin/organizations/${id}`, {
                method: "PATCH",
                body
            })
        } else {
            await useFetch<Organization>('/api/admin/organizations', {
                method: "POST",
                body
            })
        }

        toast({
            title: values?.id ? `Organization bearbeitet` : `Organization erstellt`,
            description: `Deine Eingabe wurde gespeichert.`,
        })

        emit('submit');
    } catch (error) {
        console.log('error creating organization', error);
    }
})
</script>

<template>
    <form @submit="onSubmit">
        <input name="id" type="hidden" readonly />
        <div class="grid grid-cols-6 gap-x-2 gap-y-4">
            <div class="col-span-full">
                <FormField v-slot="{ componentField }" name="name">
                    <FormItem class="grid gap">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input v-bind="componentField" :disabled="loading" />
                        </FormControl>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <div class="col-span-full">
                <FormField name="bio">
                    <FormItem class="grid gap">
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                            <FormTiptapEditor name="bio" :form-values="values" :set-field-value="setFieldValue"
                                :disabled="loading" />
                        </FormControl>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <div class="col-span-full">
                <FormField v-slot="{ componentField }" name="code">
                    <FormItem class="grid gap">
                        <FormLabel>Kennung</FormLabel>
                        <FormControl>
                            <Input v-bind="componentField" :disabled="loading || values.id" />
                        </FormControl>
                        <FormDescription>
                            Die Kennung dient der eindeutigen Zuordnung, ohne den eigentlichen Namen zu veröffentlichen
                            und zur Identifikation bei Kalendereinträgen.
                        </FormDescription>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <div class="col-span-full">
                <Label>Members</Label>
                <p class="text-muted-foreground text-sm">Füge dieser Organisation Menschen hinzu und vergib ggf.
                    spezielle Berechtigungen.</p>
                <AdminOrganizationFormMembers name="members" class="mt-3" />
            </div>
        </div>
        <div class="flex justify-end gap-4 mt-4">
            <Button type="button" variant="outline" @click="emit('cancel')">
                Abbrechen
            </Button>
            <Button type="submit">Absenden</Button>
        </div>
    </form>
</template>