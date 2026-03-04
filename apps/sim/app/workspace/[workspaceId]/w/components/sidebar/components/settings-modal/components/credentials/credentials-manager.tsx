'use client'

import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createLogger } from '@sim/logger'
import { AlertTriangle, Check, Clipboard, Plus, Search, Share2, X } from 'lucide-react'
import { useParams } from 'next/navigation'
import {
  Badge,
  Button,
  ButtonGroup,
  ButtonGroupItem,
  Combobox,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  Tooltip,
} from '@/components/emcn'
import { Skeleton, Input as UiInput } from '@/components/ui'
import { useSession } from '@/lib/auth/auth-client'
import {
  clearPendingCredentialCreateRequest,
  PENDING_CREDENTIAL_CREATE_REQUEST_EVENT,
  type PendingCredentialCreateRequest,
  readPendingCredentialCreateRequest,
} from '@/lib/credentials/client-state'
import {
  getCanonicalScopesForProvider,
  getServiceConfigByProviderId,
  type OAuthProvider,
} from '@/lib/oauth'
import { OAuthRequiredModal } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/editor/components/sub-block/components/credential-selector/components/oauth-required-modal'
import { isValidEnvVarName } from '@/executor/constants'
import {
  useCreateWorkspaceCredential,
  useDeleteWorkspaceCredential,
  useRemoveWorkspaceCredentialMember,
  useUpdateWorkspaceCredential,
  useUpsertWorkspaceCredentialMember,
  useWorkspaceCredentialMembers,
  useWorkspaceCredentials,
  type WorkspaceCredential,
  type WorkspaceCredentialRole,
} from '@/hooks/queries/credentials'
import {
  usePersonalEnvironment,
  useSavePersonalEnvironment,
  useUpsertWorkspaceEnvironment,
  useWorkspaceEnvironment,
} from '@/hooks/queries/environment'
import {
  useConnectOAuthService,
  useDisconnectOAuthService,
  useOAuthConnections,
} from '@/hooks/queries/oauth-connections'
import { useWorkspacePermissionsQuery } from '@/hooks/queries/workspace'
import { useSettingsModalStore } from '@/stores/modals/settings/store'
import { useTranslation } from '@/hooks/use-translation'

const logger = createLogger('CredentialsManager')

const roleOptionKeys = [
  { value: 'member', labelKey: 'settings.secrets.member' },
  { value: 'admin', labelKey: 'settings.secrets.admin' },
] as const

type CreateCredentialType = 'oauth' | 'secret'
type SecretScope = 'workspace' | 'personal'
type SecretInputMode = 'single' | 'bulk'

const createTypeOptionKeys = [
  { value: 'secret', labelKey: 'settings.secrets.secret' },
  { value: 'oauth', labelKey: 'settings.secrets.oauthAccount' },
] as const

interface ParsedEnvEntry {
  key: string
  value: string
}

/**
 * Parses `.env`-style text into key-value pairs.
 * Supports `KEY=VALUE`, quoted values, comments (#), and blank lines.
 */
function parseEnvText(text: string): { entries: ParsedEnvEntry[]; errors: string[] } {
  const entries: ParsedEnvEntry[] = []
  const errors: string[] = []
  const seenKeys = new Set<string>()

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw || raw.startsWith('#')) continue

    const eqIndex = raw.indexOf('=')
    if (eqIndex === -1) {
      errors.push(`Line ${i + 1}: missing "=" separator`)
      continue
    }

    const key = raw.slice(0, eqIndex).trim()
    let value = raw.slice(eqIndex + 1).trim()

    if (!key) {
      errors.push(`Line ${i + 1}: empty key`)
      continue
    }

    if (!isValidEnvVarName(key)) {
      errors.push(`Line ${i + 1}: "${key}" must contain only letters, numbers, and underscores`)
      continue
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!value) {
      errors.push(`Line ${i + 1}: "${key}" has an empty value`)
      continue
    }

    if (seenKeys.has(key.toUpperCase())) {
      errors.push(`Line ${i + 1}: duplicate key "${key}"`)
      continue
    }

    seenKeys.add(key.toUpperCase())
    entries.push({ key, value })
  }

  return { entries, errors }
}

function getSecretCredentialType(
  scope: SecretScope
): Extract<WorkspaceCredential['type'], 'env_workspace' | 'env_personal'> {
  return scope === 'workspace' ? 'env_workspace' : 'env_personal'
}

function typeBadgeVariant(_type: WorkspaceCredential['type']): 'gray-secondary' {
  return 'gray-secondary'
}

function typeLabel(type: WorkspaceCredential['type'], t: (key: string) => string): string {
  if (type === 'oauth') return 'OAuth'
  if (type === 'env_workspace') return t('settings.secrets.workspaceSecret')
  return t('settings.secrets.personalSecret')
}

function normalizeEnvKeyInput(raw: string): string {
  const trimmed = raw.trim()
  const wrappedMatch = /^\{\{\s*([A-Za-z0-9_]+)\s*\}\}$/.exec(trimmed)
  return wrappedMatch ? wrappedMatch[1] : trimmed
}

function CredentialSkeleton() {
  return (
    <div className='flex items-center justify-between gap-[12px]'>
      <div className='flex min-w-0 flex-col justify-center gap-[1px]'>
        <Skeleton className='h-[14px] w-[100px]' />
        <Skeleton className='h-[13px] w-[200px]' />
      </div>
      <div className='flex flex-shrink-0 items-center gap-[8px]'>
        <Skeleton className='h-[30px] w-[54px] rounded-[4px]' />
        <Skeleton className='h-[30px] w-[50px] rounded-[4px]' />
      </div>
    </div>
  )
}

interface CredentialsManagerProps {
  onOpenChange?: (open: boolean) => void
}

export function CredentialsManager({ onOpenChange }: CredentialsManagerProps) {
  const { t } = useTranslation()
  const params = useParams()
  const workspaceId = (params?.workspaceId as string) || ''

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null)
  const [memberRole, setMemberRole] = useState<WorkspaceCredentialRole>('admin')
  const [memberUserId, setMemberUserId] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState<CreateCredentialType>('secret')
  const [createSecretScope, setCreateSecretScope] = useState<SecretScope>('workspace')
  const [createDisplayName, setCreateDisplayName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createEnvKey, setCreateEnvKey] = useState('')
  const [createEnvValue, setCreateEnvValue] = useState('')
  const [isCreateEnvValueFocused, setIsCreateEnvValueFocused] = useState(false)
  const [createOAuthProviderId, setCreateOAuthProviderId] = useState('')
  const [createSecretInputMode, setCreateSecretInputMode] = useState<SecretInputMode>('single')
  const [createBulkEntries, setCreateBulkEntries] = useState<ParsedEnvEntry[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [selectedEnvValueDraft, setSelectedEnvValueDraft] = useState('')
  const [isEditingEnvValue, setIsEditingEnvValue] = useState(false)
  const [selectedDescriptionDraft, setSelectedDescriptionDraft] = useState('')
  const [selectedDisplayNameDraft, setSelectedDisplayNameDraft] = useState('')
  const [showCreateOAuthRequiredModal, setShowCreateOAuthRequiredModal] = useState(false)
  const [copyIdSuccess, setCopyIdSuccess] = useState(false)
  const [credentialToDelete, setCredentialToDelete] = useState<WorkspaceCredential | null>(null)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false)
  const [unsavedChangesAlertSource, setUnsavedChangesAlertSource] = useState<
    'back' | 'modal-close'
  >('back')
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ''

  const {
    data: credentials = [],
    isPending: credentialsLoading,
    refetch: refetchCredentials,
  } = useWorkspaceCredentials({
    workspaceId,
    enabled: Boolean(workspaceId),
  })

  const { data: oauthConnections = [] } = useOAuthConnections()
  const connectOAuthService = useConnectOAuthService()
  const disconnectOAuthService = useDisconnectOAuthService()
  const savePersonalEnvironment = useSavePersonalEnvironment()
  const upsertWorkspaceEnvironment = useUpsertWorkspaceEnvironment()
  const { data: personalEnvironment = {} } = usePersonalEnvironment()
  const { data: workspaceEnvironmentData } = useWorkspaceEnvironment(workspaceId, {
    select: (data) => data,
  })

  const { data: workspacePermissions } = useWorkspacePermissionsQuery(workspaceId || null)
  const selectedCredential = useMemo(
    () => credentials.find((credential) => credential.id === selectedCredentialId) || null,
    [credentials, selectedCredentialId]
  )

  const { data: members = [], isPending: membersLoading } = useWorkspaceCredentialMembers(
    selectedCredential?.id
  )

  const createCredential = useCreateWorkspaceCredential()
  const updateCredential = useUpdateWorkspaceCredential()
  const deleteCredential = useDeleteWorkspaceCredential()
  const upsertMember = useUpsertWorkspaceCredentialMember()
  const removeMember = useRemoveWorkspaceCredentialMember()
  const oauthServiceNameByProviderId = useMemo(
    () => new Map(oauthConnections.map((service) => [service.providerId, service.name])),
    [oauthConnections]
  )
  const resolveProviderLabel = (providerId?: string | null): string => {
    if (!providerId) return ''
    return oauthServiceNameByProviderId.get(providerId) || providerId
  }

  const filteredCredentials = useMemo(() => {
    if (!searchTerm.trim()) return credentials
    const normalized = searchTerm.toLowerCase()
    return credentials.filter((credential) => {
      return (
        credential.displayName.toLowerCase().includes(normalized) ||
        (credential.description || '').toLowerCase().includes(normalized) ||
        (credential.providerId || '').toLowerCase().includes(normalized) ||
        resolveProviderLabel(credential.providerId).toLowerCase().includes(normalized) ||
        typeLabel(credential.type, t).toLowerCase().includes(normalized)
      )
    })
  }, [credentials, searchTerm, oauthConnections])

  const sortedCredentials = useMemo(() => {
    return [...filteredCredentials].sort((a, b) => {
      const aDate = new Date(a.updatedAt).getTime()
      const bDate = new Date(b.updatedAt).getTime()
      return bDate - aDate
    })
  }, [filteredCredentials])

  const oauthServiceOptions = useMemo(
    () =>
      oauthConnections.map((service) => ({
        value: service.providerId,
        label: service.name,
        icon: getServiceConfigByProviderId(service.providerId)?.icon,
      })),
    [oauthConnections]
  )

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active'),
    [members]
  )
  const adminMemberCount = useMemo(
    () => activeMembers.filter((member) => member.role === 'admin').length,
    [activeMembers]
  )

  const workspaceUserOptions = useMemo(() => {
    const activeMemberUserIds = new Set(activeMembers.map((member) => member.userId))
    return (workspacePermissions?.users || [])
      .filter((user) => !activeMemberUserIds.has(user.userId))
      .map((user) => ({
        value: user.userId,
        label: user.name || user.email,
      }))
  }, [workspacePermissions?.users, activeMembers])

  const selectedOAuthService = useMemo(
    () => oauthConnections.find((service) => service.providerId === createOAuthProviderId) || null,
    [oauthConnections, createOAuthProviderId]
  )
  const createOAuthRequiredScopes = useMemo(() => {
    if (!createOAuthProviderId) return []
    if (selectedOAuthService?.scopes?.length) {
      return selectedOAuthService.scopes
    }
    return getCanonicalScopesForProvider(createOAuthProviderId)
  }, [selectedOAuthService, createOAuthProviderId])
  const createSecretType = useMemo(
    () => getSecretCredentialType(createSecretScope),
    [createSecretScope]
  )
  const selectedExistingEnvCredential = useMemo(() => {
    if (createType !== 'secret' || createSecretInputMode !== 'single') return null
    const envKey = normalizeEnvKeyInput(createEnvKey)
    if (!envKey) return null
    return (
      credentials.find(
        (row) =>
          row.type === createSecretType && (row.envKey || '').toLowerCase() === envKey.toLowerCase()
      ) ?? null
    )
  }, [credentials, createEnvKey, createSecretType, createType, createSecretInputMode])

  const crossScopeEnvConflict = useMemo(() => {
    if (createType !== 'secret' || createSecretInputMode !== 'single') return null
    if (createSecretScope !== 'personal') return null
    const envKey = normalizeEnvKeyInput(createEnvKey)
    if (!envKey) return null
    return (
      credentials.find(
        (row) =>
          row.type === 'env_workspace' && (row.envKey || '').toLowerCase() === envKey.toLowerCase()
      ) ?? null
    )
  }, [credentials, createEnvKey, createSecretScope, createType, createSecretInputMode])

  const existingOAuthDisplayName = useMemo(() => {
    if (createType !== 'oauth') return null
    const name = createDisplayName.trim()
    if (!name) return null
    return (
      credentials.find(
        (row) => row.type === 'oauth' && row.displayName.toLowerCase() === name.toLowerCase()
      ) ?? null
    )
  }, [credentials, createDisplayName, createType])
  const selectedEnvCurrentValue = useMemo(() => {
    if (!selectedCredential || selectedCredential.type === 'oauth') return ''
    const envKey = selectedCredential.envKey || ''
    if (!envKey) return ''

    if (selectedCredential.type === 'env_workspace') {
      return workspaceEnvironmentData?.workspace?.[envKey] || ''
    }

    if (selectedCredential.envOwnerUserId && selectedCredential.envOwnerUserId !== currentUserId) {
      return ''
    }

    return personalEnvironment[envKey]?.value || workspaceEnvironmentData?.personal?.[envKey] || ''
  }, [selectedCredential, workspaceEnvironmentData, personalEnvironment, currentUserId])
  const isEnvValueDirty = useMemo(() => {
    if (!selectedCredential || selectedCredential.type === 'oauth') return false
    return selectedEnvValueDraft !== selectedEnvCurrentValue
  }, [selectedCredential, selectedEnvValueDraft, selectedEnvCurrentValue])

  const isDescriptionDirty = useMemo(() => {
    if (!selectedCredential) return false
    return selectedDescriptionDraft !== (selectedCredential.description || '')
  }, [selectedCredential, selectedDescriptionDraft])

  const isDisplayNameDirty = useMemo(() => {
    if (!selectedCredential) return false
    return selectedDisplayNameDraft !== selectedCredential.displayName
  }, [selectedCredential, selectedDisplayNameDraft])

  const isDetailsDirty = isEnvValueDirty || isDescriptionDirty || isDisplayNameDirty
  const [isSavingDetails, setIsSavingDetails] = useState(false)

  const handleSaveDetails = async () => {
    if (!selectedCredential || !isSelectedAdmin || !isDetailsDirty) return
    setDetailsError(null)
    setIsSavingDetails(true)

    try {
      if (isDisplayNameDirty || isDescriptionDirty) {
        await updateCredential.mutateAsync({
          credentialId: selectedCredential.id,
          ...(isDisplayNameDirty && selectedCredential.type === 'oauth'
            ? { displayName: selectedDisplayNameDraft.trim() }
            : {}),
          ...(isDescriptionDirty ? { description: selectedDescriptionDraft.trim() || null } : {}),
        })
      }

      if (isEnvValueDirty && canEditSelectedEnvValue) {
        const envKey = selectedCredential.envKey || ''
        if (envKey) {
          if (selectedCredential.type === 'env_workspace') {
            await upsertWorkspaceEnvironment.mutateAsync({
              workspaceId,
              variables: { [envKey]: selectedEnvValueDraft },
            })
          } else {
            const personalVariables = Object.entries(personalEnvironment).reduce(
              (acc, [key, value]) => ({
                ...acc,
                [key]: value.value,
              }),
              {} as Record<string, string>
            )
            await savePersonalEnvironment.mutateAsync({
              variables: { ...personalVariables, [envKey]: selectedEnvValueDraft },
            })
          }
        }
      }

      await refetchCredentials()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedSaveChanges')
      setDetailsError(message)
      logger.error('Failed to save credential details', error)
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleBackAttempt = useCallback(() => {
    if (isDetailsDirty && !isSavingDetails) {
      setUnsavedChangesAlertSource('back')
      setShowUnsavedChangesAlert(true)
    } else {
      setSelectedCredentialId(null)
    }
  }, [isDetailsDirty, isSavingDetails])

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedChangesAlert(false)
    setSelectedEnvValueDraft(selectedEnvCurrentValue)
    setSelectedDescriptionDraft(selectedCredential?.description || '')
    setSelectedDisplayNameDraft(selectedCredential?.displayName || '')
    setSelectedCredentialId(null)
  }, [selectedEnvCurrentValue, selectedCredential])

  const handleDiscardAndClose = useCallback(() => {
    setShowUnsavedChangesAlert(false)
    useSettingsModalStore.getState().setHasUnsavedChanges(false)
    useSettingsModalStore.getState().setOnCloseAttempt(null)
    onOpenChange?.(false)
  }, [onOpenChange])

  const handleCloseAttemptFromModal = useCallback(() => {
    if (selectedCredentialId && isDetailsDirty && !isSavingDetails) {
      setUnsavedChangesAlertSource('modal-close')
      setShowUnsavedChangesAlert(true)
    }
  }, [selectedCredentialId, isDetailsDirty, isSavingDetails])

  useEffect(() => {
    const store = useSettingsModalStore.getState()
    if (selectedCredentialId && isDetailsDirty) {
      store.setHasUnsavedChanges(true)
      store.setOnCloseAttempt(handleCloseAttemptFromModal)
    } else {
      store.setHasUnsavedChanges(false)
      store.setOnCloseAttempt(null)
    }
  }, [selectedCredentialId, isDetailsDirty, handleCloseAttemptFromModal])

  useEffect(() => {
    return () => {
      const store = useSettingsModalStore.getState()
      store.setHasUnsavedChanges(false)
      store.setOnCloseAttempt(null)
    }
  }, [])

  const applyPendingCredentialCreateRequest = useCallback(
    (request: PendingCredentialCreateRequest) => {
      if (request.workspaceId !== workspaceId) {
        return
      }

      if (Date.now() - request.requestedAt > 15 * 60 * 1000) {
        clearPendingCredentialCreateRequest()
        return
      }

      setShowCreateModal(true)
      setShowCreateOAuthRequiredModal(false)
      setCreateError(null)
      setCreateDescription('')
      setCreateEnvValue('')

      if (request.type === 'oauth') {
        setCreateType('oauth')
        setCreateOAuthProviderId(request.providerId)
        setCreateDisplayName(request.displayName)
        setCreateEnvKey('')
      } else {
        setCreateType('secret')
        setCreateSecretScope(request.type === 'env_workspace' ? 'workspace' : 'personal')
        setCreateOAuthProviderId('')
        setCreateDisplayName('')
        setCreateEnvKey(request.envKey || '')
      }

      clearPendingCredentialCreateRequest()
    },
    [workspaceId]
  )

  useEffect(() => {
    if (!workspaceId) return
    const request = readPendingCredentialCreateRequest()
    if (!request) return
    applyPendingCredentialCreateRequest(request)
  }, [workspaceId, applyPendingCredentialCreateRequest])

  useEffect(() => {
    if (!workspaceId) return

    const handlePendingCreateRequest = (event: Event) => {
      const request = (event as CustomEvent<PendingCredentialCreateRequest>).detail
      if (!request) return
      applyPendingCredentialCreateRequest(request)
    }

    window.addEventListener(
      PENDING_CREDENTIAL_CREATE_REQUEST_EVENT,
      handlePendingCreateRequest as EventListener
    )

    return () => {
      window.removeEventListener(
        PENDING_CREDENTIAL_CREATE_REQUEST_EVENT,
        handlePendingCreateRequest as EventListener
      )
    }
  }, [workspaceId, applyPendingCredentialCreateRequest])

  useEffect(() => {
    if (!selectedCredential) {
      setSelectedEnvValueDraft('')
      setIsEditingEnvValue(false)
      setSelectedDescriptionDraft('')
      setSelectedDisplayNameDraft('')
      return
    }

    setDetailsError(null)
    setSelectedDescriptionDraft(selectedCredential.description || '')
    setSelectedDisplayNameDraft(selectedCredential.displayName)

    if (selectedCredential.type === 'oauth') {
      setSelectedEnvValueDraft('')
      setIsEditingEnvValue(false)
      return
    }

    const envKey = selectedCredential.envKey || ''
    if (!envKey) {
      setSelectedEnvValueDraft('')
      return
    }

    setSelectedEnvValueDraft(selectedEnvCurrentValue)
    setIsEditingEnvValue(false)
  }, [selectedCredential, selectedEnvCurrentValue])

  const isSelectedAdmin = selectedCredential?.role === 'admin'
  const selectedOAuthServiceConfig = useMemo(() => {
    if (
      !selectedCredential ||
      selectedCredential.type !== 'oauth' ||
      !selectedCredential.providerId
    ) {
      return null
    }

    return getServiceConfigByProviderId(selectedCredential.providerId)
  }, [selectedCredential])

  const resetCreateForm = () => {
    setCreateType('secret')
    setCreateSecretScope('workspace')
    setCreateSecretInputMode('single')
    setCreateDisplayName('')
    setCreateDescription('')
    setCreateEnvKey('')
    setCreateEnvValue('')
    setCreateBulkEntries([])
    setCreateOAuthProviderId('')
    setCreateError(null)
    setShowCreateOAuthRequiredModal(false)
  }

  const handleSelectCredential = (credential: WorkspaceCredential) => {
    setSelectedCredentialId(credential.id)
    setDetailsError(null)
  }

  const canEditSelectedEnvValue = useMemo(() => {
    if (!selectedCredential || selectedCredential.type === 'oauth') return false
    if (!isSelectedAdmin) return false
    if (selectedCredential.type === 'env_workspace') return true
    return Boolean(
      selectedCredential.envOwnerUserId &&
        currentUserId &&
        selectedCredential.envOwnerUserId === currentUserId
    )
  }, [selectedCredential, isSelectedAdmin, currentUserId])

  const handleCreateCredential = async () => {
    if (!workspaceId) return
    setCreateError(null)
    const normalizedDescription = createDescription.trim()

    try {
      if (createType === 'oauth') {
        if (!selectedOAuthService) {
          setCreateError(t('settings.secrets.selectOAuthFirst'))
          return
        }
        if (!createDisplayName.trim()) {
          setCreateError(t('settings.secrets.displayNameRequired'))
          return
        }
        setShowCreateOAuthRequiredModal(true)
        return
      }

      if (createSecretInputMode === 'bulk') {
        await handleBulkCreateSecrets()
        return
      }

      if (!createEnvKey.trim()) return
      const normalizedEnvKey = normalizeEnvKeyInput(createEnvKey)
      if (!isValidEnvVarName(normalizedEnvKey)) {
        setCreateError(t('settings.secrets.invalidSecretKey'))
        return
      }
      if (!createEnvValue.trim()) {
        setCreateError(t('settings.secrets.secretValueRequired'))
        return
      }

      if (createSecretType === 'env_personal') {
        const personalVariables = Object.entries(personalEnvironment).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value.value,
          }),
          {} as Record<string, string>
        )

        await savePersonalEnvironment.mutateAsync({
          variables: {
            ...personalVariables,
            [normalizedEnvKey]: createEnvValue.trim(),
          },
        })
      } else {
        const workspaceVariables = workspaceEnvironmentData?.workspace ?? {}
        await upsertWorkspaceEnvironment.mutateAsync({
          workspaceId,
          variables: {
            ...workspaceVariables,
            [normalizedEnvKey]: createEnvValue.trim(),
          },
        })
      }

      const response = await createCredential.mutateAsync({
        workspaceId,
        type: createSecretType,
        envKey: normalizedEnvKey,
        description: normalizedDescription || undefined,
      })
      const credentialId = response?.credential?.id
      if (credentialId) {
        setSelectedCredentialId(credentialId)
      }

      await refetchCredentials()

      setShowCreateModal(false)
      resetCreateForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedCreateSecret')
      setCreateError(message)
      logger.error('Failed to create credential', error)
    }
  }

  const handleBulkCreateSecrets = async () => {
    if (!workspaceId) return
    setCreateError(null)

    const entries = createBulkEntries
      .map((e) => ({ key: e.key.trim(), value: e.value.trim() }))
      .filter((e) => e.key || e.value)

    if (entries.length === 0) {
      setCreateError(t('settings.secrets.addAtLeastOne'))
      return
    }

    const errors: string[] = []
    const seenKeys = new Set<string>()
    for (let i = 0; i < entries.length; i++) {
      const { key, value } = entries[i]
      if (!key) {
        errors.push(`Row ${i + 1}: empty key`)
        continue
      }
      if (!isValidEnvVarName(key)) {
        errors.push(`Row ${i + 1}: "${key}" must contain only letters, numbers, and underscores`)
        continue
      }
      if (!value) {
        errors.push(`Row ${i + 1}: "${key}" has an empty value`)
        continue
      }
      if (seenKeys.has(key.toUpperCase())) {
        errors.push(`Row ${i + 1}: duplicate key "${key}"`)
        continue
      }
      seenKeys.add(key.toUpperCase())
    }

    if (errors.length > 0) {
      setCreateError(errors.join('\n'))
      return
    }

    try {
      const newVars: Record<string, string> = {}
      for (const entry of entries) {
        newVars[entry.key] = entry.value
      }

      if (createSecretType === 'env_personal') {
        const personalVariables = Object.entries(personalEnvironment).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value.value,
          }),
          {} as Record<string, string>
        )

        await savePersonalEnvironment.mutateAsync({
          variables: { ...personalVariables, ...newVars },
        })
      } else {
        const workspaceVariables = workspaceEnvironmentData?.workspace ?? {}
        await upsertWorkspaceEnvironment.mutateAsync({
          workspaceId,
          variables: { ...workspaceVariables, ...newVars },
        })
      }

      let lastCredentialId: string | null = null
      for (const entry of entries) {
        const response = await createCredential.mutateAsync({
          workspaceId,
          type: createSecretType,
          envKey: entry.key,
        })
        if (response?.credential?.id) {
          lastCredentialId = response.credential.id
        }
      }

      if (lastCredentialId) {
        setSelectedCredentialId(lastCredentialId)
      }

      await refetchCredentials()

      setShowCreateModal(false)
      resetCreateForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedCreateSecrets')
      setCreateError(message)
      logger.error('Failed to bulk create secrets', error)
    }
  }

  const handleConnectOAuthService = async () => {
    if (!selectedOAuthService) {
      setCreateError(t('settings.secrets.selectOAuthFirst'))
      return
    }

    const displayName = createDisplayName.trim()
    if (!displayName) {
      setCreateError(t('settings.secrets.displayNameRequired'))
      return
    }

    setCreateError(null)
    try {
      await fetch('/api/credentials/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          providerId: selectedOAuthService.providerId,
          displayName,
          description: createDescription.trim() || undefined,
        }),
      })

      window.sessionStorage.setItem(
        'sim.oauth-connect-pending',
        JSON.stringify({
          displayName,
          providerId: selectedOAuthService.providerId,
          preCount: credentials.filter((c) => c.type === 'oauth').length,
          workspaceId,
        })
      )

      await connectOAuthService.mutateAsync({
        providerId: selectedOAuthService.providerId,
        callbackURL: window.location.href,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedOAuthConnect')
      setCreateError(message)
      logger.error('Failed to connect OAuth service', error)
    }
  }

  const handleDeleteClick = (credential: WorkspaceCredential) => {
    setCredentialToDelete(credential)
    setDeleteError(null)
    setShowDeleteConfirmDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!credentialToDelete) return
    setDeleteError(null)

    try {
      if (credentialToDelete.type === 'oauth') {
        if (!credentialToDelete.accountId || !credentialToDelete.providerId) {
          const errorMessage =
            t('settings.secrets.cannotDisconnect')
          setDeleteError(errorMessage)
          logger.error('Cannot disconnect OAuth credential: missing accountId or providerId')
          return
        }
        await disconnectOAuthService.mutateAsync({
          provider: credentialToDelete.providerId.split('-')[0] || credentialToDelete.providerId,
          providerId: credentialToDelete.providerId,
          serviceId: credentialToDelete.providerId,
          accountId: credentialToDelete.accountId,
        })
        await refetchCredentials()
        window.dispatchEvent(
          new CustomEvent('oauth-credentials-updated', {
            detail: { providerId: credentialToDelete.providerId, workspaceId },
          })
        )
      } else {
        await deleteCredential.mutateAsync(credentialToDelete.id)
      }
      if (selectedCredentialId === credentialToDelete.id) {
        setSelectedCredentialId(null)
      }
      setShowDeleteConfirmDialog(false)
      setCredentialToDelete(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedDelete')
      setDeleteError(message)
      logger.error(t('settings.secrets.failedDelete'), error)
    }
  }

  const [isPromoting, setIsPromoting] = useState(false)
  const [isShareingWithWorkspace, setIsSharingWithWorkspace] = useState(false)

  const handleShareWithWorkspace = async () => {
    if (!selectedCredential || !isSelectedAdmin) return
    const usersToAdd = workspaceUserOptions
    if (usersToAdd.length === 0) return

    setDetailsError(null)
    setIsSharingWithWorkspace(true)

    try {
      for (const user of usersToAdd) {
        await upsertMember.mutateAsync({
          credentialId: selectedCredential.id,
          userId: user.value,
          role: 'member',
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedShare')
      setDetailsError(message)
      logger.error('Failed to share credential with workspace', error)
    } finally {
      setIsSharingWithWorkspace(false)
    }
  }

  const handlePromoteToWorkspace = async () => {
    if (!selectedCredential || selectedCredential.type !== 'env_personal' || !workspaceId) return
    const envKey = selectedCredential.envKey || ''
    if (!envKey) return

    setDetailsError(null)
    setIsPromoting(true)

    try {
      const currentValue =
        personalEnvironment[envKey]?.value || workspaceEnvironmentData?.personal?.[envKey] || ''

      if (!currentValue) {
        setDetailsError(t('settings.secrets.cannotPromoteEmpty'))
        setIsPromoting(false)
        return
      }

      const workspaceVariables = workspaceEnvironmentData?.workspace ?? {}
      await upsertWorkspaceEnvironment.mutateAsync({
        workspaceId,
        variables: { ...workspaceVariables, [envKey]: currentValue },
      })

      const response = await createCredential.mutateAsync({
        workspaceId,
        type: 'env_workspace',
        envKey,
        description: selectedCredential.description || undefined,
      })

      await deleteCredential.mutateAsync(selectedCredential.id)

      const newCredentialId = response?.credential?.id
      if (newCredentialId) {
        setSelectedCredentialId(newCredentialId)
      } else {
        setSelectedCredentialId(null)
      }

      await refetchCredentials()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedPromote')
      setDetailsError(message)
      logger.error('Failed to promote personal secret to workspace', error)
    } finally {
      setIsPromoting(false)
    }
  }

  const handleReconnectOAuth = async () => {
    if (
      !selectedCredential ||
      selectedCredential.type !== 'oauth' ||
      !selectedCredential.providerId ||
      !workspaceId
    )
      return

    setDetailsError(null)

    try {
      await fetch('/api/credentials/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          providerId: selectedCredential.providerId,
          displayName: selectedCredential.displayName,
          description: selectedCredential.description || undefined,
          credentialId: selectedCredential.id,
        }),
      })

      window.sessionStorage.setItem(
        'sim.oauth-connect-pending',
        JSON.stringify({
          displayName: selectedCredential.displayName,
          providerId: selectedCredential.providerId,
          preCount: credentials.filter((c) => c.type === 'oauth').length,
          workspaceId,
          reconnect: true,
        })
      )

      await connectOAuthService.mutateAsync({
        providerId: selectedCredential.providerId,
        callbackURL: window.location.href,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('settings.secrets.failedReconnect')
      setDetailsError(message)
      logger.error('Failed to reconnect OAuth credential', error)
    }
  }

  const handleAddMember = async () => {
    if (!selectedCredential || !memberUserId) return
    try {
      await upsertMember.mutateAsync({
        credentialId: selectedCredential.id,
        userId: memberUserId,
        role: memberRole,
      })
      setMemberUserId('')
      setMemberRole('admin')
    } catch (error) {
      logger.error('Failed to add credential member', error)
    }
  }

  const handleChangeMemberRole = async (userId: string, role: WorkspaceCredentialRole) => {
    if (!selectedCredential) return
    const currentMember = activeMembers.find((member) => member.userId === userId)
    if (currentMember?.role === role) return
    try {
      await upsertMember.mutateAsync({
        credentialId: selectedCredential.id,
        userId,
        role,
      })
    } catch (error) {
      logger.error('Failed to change member role', error)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedCredential) return
    try {
      await removeMember.mutateAsync({
        credentialId: selectedCredential.id,
        userId,
      })
    } catch (error) {
      logger.error('Failed to remove credential member', error)
    }
  }

  const hasCredentials = credentials && credentials.length > 0
  const showNoResults =
    searchTerm.trim() && sortedCredentials.length === 0 && credentials.length > 0

  const createModalJsx = (
    <Modal
      open={showCreateModal}
      onOpenChange={(open) => {
        setShowCreateModal(open)
        if (!open) resetCreateForm()
      }}
    >
      <ModalContent size='lg'>
        <ModalHeader>{t('settings.secrets.createSecret')}</ModalHeader>
        <ModalBody>
          {(createError ||
            existingOAuthDisplayName ||
            selectedExistingEnvCredential ||
            crossScopeEnvConflict) && (
            <div className='mb-3 flex flex-col gap-2'>
              {createError && (
                <Badge variant='red' size='lg' dot className='max-w-full'>
                  {createError}
                </Badge>
              )}
              {existingOAuthDisplayName && (
                <Badge variant='red' size='lg' dot className='max-w-full'>
                  {t('settings.secrets.secretNameExists').replace('{name}', existingOAuthDisplayName.displayName)}
                </Badge>
              )}
              {selectedExistingEnvCredential && (
                <Badge variant='red' size='lg' dot className='max-w-full'>
                  {t('settings.secrets.secretKeyExists').replace('{key}', selectedExistingEnvCredential.displayName)}
                </Badge>
              )}
              {!selectedExistingEnvCredential && crossScopeEnvConflict && (
                <Badge variant='amber' size='lg' dot className='max-w-full'>
                  {t('settings.secrets.workspaceKeyConflict').replace('{key}', crossScopeEnvConflict.envKey || '')}
                </Badge>
              )}
            </div>
          )}
          <div className='flex flex-col gap-[12px]'>
            <div>
              <Label>{t('common.type')}</Label>
              <div className='mt-[6px]'>
                <Combobox
                  options={createTypeOptionKeys.map((option) => ({
                    value: option.value,
                    label: t(option.labelKey),
                  }))}
                  value={
                    (() => {
                      const opt = createTypeOptionKeys.find((option) => option.value === createType)
                      return opt ? t(opt.labelKey) : ''
                    })()
                  }
                  selectedValue={createType}
                  onChange={(value) => {
                    const newType = value as CreateCredentialType
                    setCreateType(newType)
                    setCreateError(null)
                    if (
                      newType === 'oauth' &&
                      !createOAuthProviderId &&
                      oauthConnections.length > 0
                    ) {
                      setCreateOAuthProviderId(oauthConnections[0]?.providerId || '')
                    }
                  }}
                  placeholder={t('settings.secrets.selectType')}
                />
              </div>
            </div>

            {createType === 'oauth' ? (
              <div className='flex flex-col gap-[10px]'>
                <div>
                  <Label>
                    {t('settings.secrets.displayName')}<span className='ml-1'>*</span>
                  </Label>
                  <Input
                    value={createDisplayName}
                    onChange={(event) => setCreateDisplayName(event.target.value)}
                    placeholder={t('settings.secrets.secretName')}
                    autoComplete='off'
                    data-lpignore='true'
                    className='mt-[6px]'
                  />
                </div>
                <div>
                  <Label>{t('common.description')}</Label>
                  <Textarea
                    value={createDescription}
                    onChange={(event) => setCreateDescription(event.target.value)}
                    placeholder={t('settings.secrets.optionalDescription')}
                    maxLength={500}
                    autoComplete='off'
                    data-lpignore='true'
                    className='mt-[6px] min-h-[80px] resize-none'
                  />
                </div>
                <div>
                  <Label>{t('settings.secrets.account')}</Label>
                  <div className='mt-[6px]'>
                    <Combobox
                      options={oauthServiceOptions}
                      value={
                        oauthServiceOptions.find((option) => option.value === createOAuthProviderId)
                          ?.label || ''
                      }
                      selectedValue={createOAuthProviderId}
                      onChange={(value) => {
                        setCreateOAuthProviderId(value)
                        setCreateError(null)
                      }}
                      placeholder={t('settings.secrets.selectOAuthService')}
                      searchable
                      searchPlaceholder={t('settings.secrets.searchServices')}
                      overlayContent={
                        createOAuthProviderId
                          ? (() => {
                              const config = getServiceConfigByProviderId(createOAuthProviderId)
                              const label =
                                oauthServiceOptions.find((o) => o.value === createOAuthProviderId)
                                  ?.label || ''
                              return (
                                <div className='flex items-center gap-[8px]'>
                                  {config &&
                                    createElement(config.icon, {
                                      className: 'h-[14px] w-[14px] flex-shrink-0',
                                    })}
                                  <span className='truncate'>{label}</span>
                                </div>
                              )
                            })()
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex flex-col gap-[10px]'>
                {createSecretInputMode === 'single' ? (
                  <>
                    <div>
                      <div className='grid grid-cols-[minmax(0,1fr)_8px_minmax(0,1fr)] items-end'>
                        <Label>
                          {t('settings.secrets.key')}<span className='ml-1'>*</span>
                        </Label>
                        <div />
                        <Label>
                          {t('common.value')}<span className='ml-1'>*</span>
                        </Label>
                      </div>
                      <div className='mt-[8px] grid grid-cols-[minmax(0,1fr)_8px_minmax(0,1fr)] items-center'>
                        <Input
                          value={createEnvKey}
                          onChange={(event) => {
                            setCreateEnvKey(event.target.value)
                          }}
                          onPaste={(event) => {
                            const pasted = event.clipboardData.getData('text')
                            const { entries } = parseEnvText(pasted)
                            if (entries.length === 0) {
                              return
                            }

                            event.preventDefault()
                            if (entries.length === 1) {
                              setCreateEnvKey(entries[0].key)
                              setCreateEnvValue(entries[0].value)
                              setCreateError(null)
                              return
                            }

                            setCreateSecretInputMode('bulk')
                            setCreateBulkEntries(entries)
                            setCreateError(null)
                          }}
                          placeholder='API_KEY'
                          autoComplete='off'
                          autoCapitalize='none'
                          autoCorrect='off'
                          spellCheck={false}
                          data-lpignore='true'
                          data-1p-ignore='true'
                        />
                        <div />
                        <Input
                          type='text'
                          value={createEnvValue}
                          onChange={(event) => setCreateEnvValue(event.target.value)}
                          onFocus={() => setIsCreateEnvValueFocused(true)}
                          onBlur={() => setIsCreateEnvValueFocused(false)}
                          placeholder={t('common.value')}
                          autoComplete='new-password'
                          autoCapitalize='none'
                          autoCorrect='off'
                          spellCheck={false}
                          data-lpignore='true'
                          data-1p-ignore='true'
                          style={
                            isCreateEnvValueFocused
                              ? undefined
                              : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{t('common.description')}</Label>
                      <Textarea
                        value={createDescription}
                        onChange={(event) => setCreateDescription(event.target.value)}
                        placeholder={t('settings.secrets.optionalDescription')}
                        maxLength={500}
                        autoComplete='off'
                        className='mt-[6px] min-h-[80px] resize-none'
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label>{t('settings.secrets.secretsCount').replace('{count}', String(createBulkEntries.length))}</Label>
                    <div className='mt-[6px] grid grid-cols-[minmax(0,1fr)_8px_minmax(0,1fr)_28px] items-end'>
                      <span className='text-[11px] text-[var(--text-secondary)]'>{t('settings.secrets.key')}</span>
                      <div />
                      <span className='text-[11px] text-[var(--text-secondary)]'>{t('common.value')}</span>
                      <div />
                    </div>
                    <div className='mt-[4px] flex max-h-[240px] flex-col gap-[4px] overflow-y-auto'>
                      {createBulkEntries.map((entry, index) => (
                        <div
                          key={index}
                          className='grid grid-cols-[minmax(0,1fr)_8px_minmax(0,1fr)_28px] items-center'
                        >
                          <Input
                            value={entry.key}
                            onChange={(event) => {
                              const updated = [...createBulkEntries]
                              updated[index] = { ...entry, key: event.target.value }
                              setCreateBulkEntries(updated)
                            }}
                            placeholder='KEY'
                            autoComplete='off'
                            autoCapitalize='none'
                            autoCorrect='off'
                            spellCheck={false}
                            data-lpignore='true'
                            data-1p-ignore='true'
                          />
                          <div />
                          <Input
                            type='text'
                            value={entry.value}
                            onChange={(event) => {
                              const updated = [...createBulkEntries]
                              updated[index] = { ...entry, value: event.target.value }
                              setCreateBulkEntries(updated)
                            }}
                            placeholder={t('common.value')}
                            autoComplete='new-password'
                            autoCapitalize='none'
                            autoCorrect='off'
                            spellCheck={false}
                            data-lpignore='true'
                            data-1p-ignore='true'
                            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                          />
                          <Button
                            variant='ghost'
                            className='h-[28px] w-[28px] p-0'
                            onClick={() => {
                              const updated = createBulkEntries.filter((_, i) => i !== index)
                              if (updated.length === 0) {
                                setCreateSecretInputMode('single')
                              }
                              setCreateBulkEntries(updated)
                            }}
                          >
                            <X className='h-[12px] w-[12px]' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className='block'>{t('settings.secrets.scope')}</Label>
                  <div className='mt-[8px]'>
                    <ButtonGroup
                      value={createSecretScope}
                      onValueChange={(value) => setCreateSecretScope(value as SecretScope)}
                    >
                      <ButtonGroupItem
                        value='workspace'
                        className='h-[28px] min-w-[80px] px-[10px] py-0 text-[12px]'
                      >
                        {t('settings.secrets.workspace')}
                      </ButtonGroupItem>
                      <ButtonGroupItem
                        value='personal'
                        className='h-[28px] min-w-[72px] px-[10px] py-0 text-[12px]'
                      >
                        {t('settings.secrets.personal')}
                      </ButtonGroupItem>
                    </ButtonGroup>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant='default' onClick={() => setShowCreateModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant='tertiary'
            onClick={handleCreateCredential}
            disabled={
              (createType === 'oauth'
                ? !createOAuthProviderId ||
                  !createDisplayName.trim() ||
                  connectOAuthService.isPending ||
                  Boolean(existingOAuthDisplayName)
                : createSecretInputMode === 'bulk'
                  ? createBulkEntries.length === 0
                  : !createEnvKey.trim() ||
                    !createEnvValue.trim() ||
                    Boolean(selectedExistingEnvCredential)) ||
              createCredential.isPending ||
              savePersonalEnvironment.isPending ||
              upsertWorkspaceEnvironment.isPending ||
              disconnectOAuthService.isPending
            }
          >
            {createType === 'oauth'
              ? connectOAuthService.isPending
                ? t('settings.secrets.connecting')
                : t('settings.secrets.connect')
              : createSecretInputMode === 'bulk'
                ? createCredential.isPending ||
                  savePersonalEnvironment.isPending ||
                  upsertWorkspaceEnvironment.isPending
                  ? t('settings.secrets.importing')
                  : t('settings.secrets.importAll')
                : t('common.create')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )

  const oauthRequiredModalJsx = showCreateOAuthRequiredModal && createOAuthProviderId && (
    <OAuthRequiredModal
      isOpen={showCreateOAuthRequiredModal}
      onClose={() => setShowCreateOAuthRequiredModal(false)}
      provider={createOAuthProviderId as OAuthProvider}
      toolName={resolveProviderLabel(createOAuthProviderId)}
      requiredScopes={createOAuthRequiredScopes}
      newScopes={[]}
      serviceId={selectedOAuthService?.id || createOAuthProviderId}
      onConnect={async () => {
        await handleConnectOAuthService()
      }}
    />
  )

  const handleCloseDeleteDialog = () => {
    setShowDeleteConfirmDialog(false)
    setCredentialToDelete(null)
    setDeleteError(null)
  }

  const deleteConfirmDialogJsx = (
    <Modal
      open={showDeleteConfirmDialog}
      onOpenChange={(open) => !open && handleCloseDeleteDialog()}
    >
      <ModalContent size='sm'>
        <ModalHeader>
          {credentialToDelete?.type === 'oauth' ? t('settings.secrets.disconnectSecret') : t('settings.secrets.deleteSecret')}
        </ModalHeader>
        <ModalBody>
          <p className='text-[12px] text-[var(--text-secondary)]'>
            {credentialToDelete?.type === 'oauth' ? t('settings.secrets.confirmDisconnect') : t('common.deleteConfirm')}{' '}
            <span className='font-medium text-[var(--text-primary)]'>
              {credentialToDelete?.displayName}
            </span>
            ? <span className='text-[var(--text-error)]'>{t('common.cannotBeUndone')}</span>
          </p>
          {deleteError && (
            <div className='mt-[12px] rounded-[8px] border border-red-500/50 bg-red-50 p-[12px] dark:bg-red-950/30'>
              <div className='flex items-start gap-[10px]'>
                <AlertTriangle className='mt-[1px] h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400' />
                <p className='text-[12px] text-red-700 dark:text-red-300'>{deleteError}</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant='default' onClick={handleCloseDeleteDialog}>
            {t('common.cancel')}
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirmDelete}
            disabled={deleteCredential.isPending || disconnectOAuthService.isPending}
          >
            {deleteCredential.isPending || disconnectOAuthService.isPending
              ? t('common.deleting')
              : credentialToDelete?.type === 'oauth'
                ? t('settings.secrets.disconnect')
                : t('common.delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )

  const unsavedChangesAlertJsx = (
    <Modal open={showUnsavedChangesAlert} onOpenChange={setShowUnsavedChangesAlert}>
      <ModalContent size='sm'>
        <ModalHeader>{t('settings.secrets.unsavedChanges')}</ModalHeader>
        <ModalBody>
          <p className='text-[12px] text-[var(--text-secondary)]'>
            {t('settings.secrets.unsavedChangesMessage')}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant='default' onClick={() => setShowUnsavedChangesAlert(false)}>
            {t('settings.secrets.keepEditing')}
          </Button>
          <Button
            variant='destructive'
            onClick={
              unsavedChangesAlertSource === 'modal-close'
                ? handleDiscardAndClose
                : handleDiscardChanges
            }
          >
            {t('settings.secrets.discardChanges')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )

  if (selectedCredential) {
    return (
      <>
        <div className='flex h-full flex-col gap-[16px]'>
          <div className='min-h-0 flex-1 overflow-y-auto'>
            <div className='flex flex-col gap-[16px]'>
              {selectedCredential.type === 'oauth' ? (
                <div className='rounded-[8px] border border-[var(--border-1)] p-[10px]'>
                  <div className='flex items-center justify-between gap-[12px]'>
                    <div className='flex min-w-0 items-center gap-[10px]'>
                      <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[var(--surface-5)]'>
                        {selectedOAuthServiceConfig ? (
                          createElement(selectedOAuthServiceConfig.icon, { className: 'h-4 w-4' })
                        ) : (
                          <span className='font-medium text-[12px] text-[var(--text-tertiary)]'>
                            {resolveProviderLabel(selectedCredential.providerId).slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className='min-w-0'>
                        <p className='text-[11px] text-[var(--text-tertiary)]'>{t('settings.secrets.connectedService')}</p>
                        <p className='truncate font-medium text-[13px] text-[var(--text-primary)]'>
                          {resolveProviderLabel(selectedCredential.providerId) || t('settings.secrets.unknownService')}
                        </p>
                      </div>
                    </div>
                    <div className='flex flex-shrink-0 items-center gap-[8px]'>
                      <Badge variant={typeBadgeVariant(selectedCredential.type)}>
                        {typeLabel(selectedCredential.type, t)}
                      </Badge>
                      {selectedCredential.role && (
                        <Badge
                          variant={
                            selectedCredential.role === 'admin' ? 'purple' : 'gray-secondary'
                          }
                        >
                          {selectedCredential.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col gap-[10px]'>
                  <div className='flex items-center justify-between gap-[6px] pl-[2px]'>
                    <Label>{t('common.type')}</Label>
                  </div>
                  <div className='flex items-center gap-[8px]'>
                    <Badge variant={typeBadgeVariant(selectedCredential.type)}>
                      {typeLabel(selectedCredential.type, t)}
                    </Badge>
                    {selectedCredential.role && (
                      <Badge
                        variant={selectedCredential.role === 'admin' ? 'purple' : 'gray-secondary'}
                      >
                        {selectedCredential.role}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {selectedCredential.type === 'oauth' ? (
                <>
                  <div className='flex flex-col gap-[10px]'>
                    <div className='flex items-center justify-between gap-[6px] pl-[2px]'>
                      <Label className='flex items-center gap-[6px]'>
                        {t('settings.secrets.displayName')}
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              type='button'
                              className='-my-1 flex h-5 w-5 items-center justify-center'
                              onClick={() => {
                                navigator.clipboard.writeText(selectedCredential.id)
                                setCopyIdSuccess(true)
                                setTimeout(() => setCopyIdSuccess(false), 2000)
                              }}
                              aria-label={t('settings.secrets.copyValue')}
                            >
                              {copyIdSuccess ? (
                                <Check className='h-3 w-3 text-green-500' />
                              ) : (
                                <Clipboard className='h-3 w-3 text-muted-foreground' />
                              )}
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            {copyIdSuccess ? t('common.copied') : t('settings.secrets.copySecretId')}
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Label>
                    </div>
                    <Input
                      id='credential-display-name'
                      value={selectedDisplayNameDraft}
                      onChange={(event) => setSelectedDisplayNameDraft(event.target.value)}
                      autoComplete='off'
                      data-lpignore='true'
                      disabled={!isSelectedAdmin}
                    />
                  </div>

                  <div className='flex flex-col gap-[10px]'>
                    <div className='flex items-center justify-between gap-[6px] pl-[2px]'>
                      <Label>{t('common.description')}</Label>
                    </div>
                    <Textarea
                      id='credential-description'
                      value={selectedDescriptionDraft}
                      onChange={(event) => setSelectedDescriptionDraft(event.target.value)}
                      placeholder={t('settings.secrets.addDescription')}
                      maxLength={500}
                      autoComplete='off'
                      data-lpignore='true'
                      disabled={!isSelectedAdmin}
                      className='min-h-[60px] resize-none'
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className='flex flex-col gap-[10px]'>
                    <div className='flex items-center justify-between gap-[6px] pl-[2px]'>
                      <Label>{t('settings.secrets.secretKey')}</Label>
                    </div>
                    <Input
                      id='credential-env-key'
                      value={selectedCredential.envKey || ''}
                      readOnly
                      disabled
                      autoComplete='off'
                    />
                  </div>

                  <div className='flex flex-col gap-[10px]'>
                    <div className='flex items-center justify-between gap-[6px] pl-[2px]'>
                      <Label>{t('settings.secrets.secretValue')}</Label>
                      {canEditSelectedEnvValue && (
                        <button
                          type='button'
                          className='-my-1 h-5 px-2 py-0 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          onClick={() => setIsEditingEnvValue((value) => !value)}
                        >
                          {isEditingEnvValue ? t('settings.secrets.hide') : t('common.edit')}
                        </button>
                      )}
                    </div>
                    <Input
                      id='credential-env-value'
                      type={isEditingEnvValue ? 'text' : 'password'}
                      value={selectedEnvValueDraft}
                      onChange={(event) => setSelectedEnvValueDraft(event.target.value)}
                      onFocus={() => {
                        if (canEditSelectedEnvValue) {
                          setIsEditingEnvValue(true)
                        }
                      }}
                      autoComplete='new-password'
                      autoCapitalize='none'
                      autoCorrect='off'
                      spellCheck={false}
                      data-lpignore='true'
                      data-1p-ignore='true'
                      readOnly={!canEditSelectedEnvValue || !isEditingEnvValue}
                      disabled={!canEditSelectedEnvValue}
                    />
                  </div>

                  <div className='flex flex-col gap-[10px]'>
                    <div className='flex items-center justify-between gap-[6px] pl-[2px]'>
                      <Label>{t('common.description')}</Label>
                    </div>
                    <Textarea
                      id='credential-description'
                      value={selectedDescriptionDraft}
                      onChange={(event) => setSelectedDescriptionDraft(event.target.value)}
                      placeholder={t('settings.secrets.addDescription')}
                      maxLength={500}
                      autoComplete='off'
                      disabled={!isSelectedAdmin}
                      className='min-h-[60px] resize-none'
                    />
                  </div>
                </>
              )}

              {detailsError && (
                <div className='rounded-[8px] border border-[var(--status-red)]/40 bg-[var(--status-red)]/10 px-[10px] py-[8px] text-[12px] text-[var(--status-red)]'>
                  {detailsError}
                </div>
              )}

              <div className='flex flex-col gap-[10px]'>
                <div className='flex items-center justify-between gap-[6px] pl-[2px]'>
                  <Label>{t('settings.secrets.membersCount').replace('{count}', String(activeMembers.length))}</Label>
                </div>

                {membersLoading ? (
                  <div className='flex flex-col gap-[8px]'>
                    <Skeleton className='h-[44px] w-full rounded-[8px]' />
                    <Skeleton className='h-[44px] w-full rounded-[8px]' />
                  </div>
                ) : (
                  <div className='flex flex-col gap-[8px]'>
                    {activeMembers.map((member) => (
                      <div
                        key={member.id}
                        className='grid grid-cols-[1fr_120px_auto] items-center gap-[8px]'
                      >
                        <div className='min-w-0'>
                          <p className='truncate font-medium text-[12px] text-[var(--text-primary)]'>
                            {member.userName || member.userEmail || member.userId}
                          </p>
                          <p className='truncate text-[11px] text-[var(--text-tertiary)]'>
                            {member.userEmail || member.userId}
                          </p>
                        </div>

                        {isSelectedAdmin ? (
                          <>
                            <Combobox
                              options={roleOptionKeys.map((option) => ({
                                value: option.value,
                                label: t(option.labelKey),
                              }))}
                              value={
                                (() => {
                                  const opt = roleOptionKeys.find((option) => option.value === member.role)
                                  return opt ? t(opt.labelKey) : ''
                                })()
                              }
                              selectedValue={member.role}
                              onChange={(value) =>
                                handleChangeMemberRole(
                                  member.userId,
                                  value as WorkspaceCredentialRole
                                )
                              }
                              placeholder={t('settings.secrets.role')}
                              disabled={member.role === 'admin' && adminMemberCount <= 1}
                              size='sm'
                            />
                            {selectedCredential.type !== 'env_workspace' ? (
                              <Button
                                variant='ghost'
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={member.role === 'admin' && adminMemberCount <= 1}
                              >
                                {t('common.remove')}
                              </Button>
                            ) : (
                              <div />
                            )}
                          </>
                        ) : (
                          <>
                            <Badge variant={member.role === 'admin' ? 'purple' : 'gray-secondary'}>
                              {member.role}
                            </Badge>
                            <div />
                          </>
                        )}
                      </div>
                    ))}
                    {isSelectedAdmin && selectedCredential.type !== 'env_workspace' && (
                      <div className='grid grid-cols-[1fr_120px_auto] items-center gap-[8px] border-[var(--border)] border-t border-dashed pt-[8px]'>
                        <Combobox
                          options={workspaceUserOptions}
                          value={
                            workspaceUserOptions.find((option) => option.value === memberUserId)
                              ?.label || ''
                          }
                          selectedValue={memberUserId}
                          onChange={setMemberUserId}
                          placeholder={t('settings.secrets.addMember')}
                          size='sm'
                        />
                        <Combobox
                          options={roleOptionKeys.map((option) => ({
                            value: option.value,
                            label: t(option.labelKey),
                          }))}
                          value={
                            (() => {
                              const opt = roleOptionKeys.find((option) => option.value === memberRole)
                              return opt ? t(opt.labelKey) : ''
                            })()
                          }
                          selectedValue={memberRole}
                          onChange={(value) => setMemberRole(value as WorkspaceCredentialRole)}
                          placeholder={t('settings.secrets.role')}
                          size='sm'
                        />
                        <Button
                          variant='ghost'
                          onClick={handleAddMember}
                          disabled={!memberUserId || upsertMember.isPending}
                        >
                          {t('common.add')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className='mt-auto flex items-center justify-between border-[var(--border)] border-t pt-[10px]'>
            <div className='flex items-center gap-[8px]'>
              {isSelectedAdmin && (
                <>
                  {selectedCredential.type === 'oauth' && (
                    <Button
                      variant='default'
                      onClick={handleReconnectOAuth}
                      disabled={connectOAuthService.isPending}
                    >
                      {t('settings.secrets.reconnectTo').replace('{provider}', resolveProviderLabel(selectedCredential.providerId) || t('settings.secrets.service'))}
                    </Button>
                  )}
                  {selectedCredential.type === 'env_personal' && (
                    <Button
                      variant='default'
                      onClick={handlePromoteToWorkspace}
                      disabled={isPromoting || deleteCredential.isPending}
                    >
                      <Share2 className='mr-[6px] h-[13px] w-[13px]' />
                      {t('settings.secrets.promoteToWorkspace')}
                    </Button>
                  )}
                  {selectedCredential.type === 'oauth' &&
                    (workspaceUserOptions.length > 0 || isShareingWithWorkspace) && (
                      <Button
                        variant='default'
                        onClick={handleShareWithWorkspace}
                        disabled={isShareingWithWorkspace || workspaceUserOptions.length === 0}
                      >
                        <Share2 className='mr-[6px] h-[13px] w-[13px]' />
                        {isShareingWithWorkspace ? t('settings.secrets.sharing') : t('settings.secrets.share')}
                      </Button>
                    )}
                  <Button
                    variant='ghost'
                    onClick={() => handleDeleteClick(selectedCredential)}
                    disabled={
                      deleteCredential.isPending || isPromoting || disconnectOAuthService.isPending
                    }
                  >
                    {selectedCredential.type === 'oauth' ? t('settings.secrets.disconnect') : t('common.delete')}
                  </Button>
                </>
              )}
            </div>
            <div className='flex items-center gap-[8px]'>
              <Button onClick={handleBackAttempt} variant='default'>
                {t('common.back')}
              </Button>
              {isSelectedAdmin && (
                <Button
                  variant='tertiary'
                  onClick={handleSaveDetails}
                  disabled={!isDetailsDirty || isSavingDetails}
                >
                  {isSavingDetails ? t('common.saving') : t('common.save')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {createModalJsx}
        {oauthRequiredModalJsx}
        {deleteConfirmDialogJsx}
        {unsavedChangesAlertJsx}
      </>
    )
  }

  return (
    <>
      <div className='flex h-full flex-col gap-[16px]'>
        <div className='flex items-center gap-[8px]'>
          <div className='flex flex-1 items-center gap-[8px] rounded-[8px] border border-[var(--border)] bg-transparent px-[8px] py-[5px] transition-colors duration-100 dark:bg-[var(--surface-4)] dark:hover:border-[var(--border-1)] dark:hover:bg-[var(--surface-5)]'>
            <Search
              className='h-[14px] w-[14px] flex-shrink-0 text-[var(--text-tertiary)]'
              strokeWidth={2}
            />
            <UiInput
              placeholder={t('settings.secrets.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={credentialsLoading}
              className='h-auto flex-1 border-0 bg-transparent p-0 font-base leading-none placeholder:text-[var(--text-tertiary)] focus-visible:ring-0 focus-visible:ring-offset-0'
            />
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={credentialsLoading}
            variant='tertiary'
          >
            <Plus className='mr-[6px] h-[13px] w-[13px]' />
            {t('common.add')}
          </Button>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto'>
          {credentialsLoading ? (
            <div className='flex flex-col gap-[8px]'>
              <CredentialSkeleton />
              <CredentialSkeleton />
              <CredentialSkeleton />
            </div>
          ) : !hasCredentials ? (
            <div className='flex h-full items-center justify-center text-[13px] text-[var(--text-muted)]'>
              {t('settings.secrets.emptyState')}
            </div>
          ) : (
            <div className='flex flex-col gap-[8px]'>
              {sortedCredentials.map((credential) => {
                const serviceConfig =
                  credential.type === 'oauth' && credential.providerId
                    ? getServiceConfigByProviderId(credential.providerId)
                    : null

                return (
                  <div key={credential.id} className='flex items-center justify-between gap-[12px]'>
                    <div className='flex min-w-0 items-center gap-[10px]'>
                      {serviceConfig && (
                        <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] bg-[var(--surface-5)]'>
                          {createElement(serviceConfig.icon, { className: 'h-4 w-4' })}
                        </div>
                      )}
                      <div className='flex min-w-0 flex-col justify-center gap-[1px]'>
                        <span className='truncate font-medium text-[14px]'>
                          {credential.displayName}
                        </span>
                        <p className='truncate text-[13px] text-[var(--text-muted)]'>
                          {credential.description || t('settings.secrets.noDescription')}
                        </p>
                      </div>
                    </div>
                    <div className='flex flex-shrink-0 items-center gap-[4px]'>
                      <Button variant='default' onClick={() => handleSelectCredential(credential)}>
                        {t('settings.workflowMcp.tabs.details')}
                      </Button>
                      {credential.role === 'admin' && (
                        <Button
                          variant='ghost'
                          onClick={() => handleDeleteClick(credential)}
                          disabled={deleteCredential.isPending || disconnectOAuthService.isPending}
                        >
                          {t('common.delete')}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              {showNoResults && (
                <div className='py-[16px] text-center text-[13px] text-[var(--text-muted)]'>
                  {t('settings.secrets.noResults').replace('{term}', searchTerm)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {createModalJsx}
      {oauthRequiredModalJsx}
      {deleteConfirmDialogJsx}
    </>
  )
}
