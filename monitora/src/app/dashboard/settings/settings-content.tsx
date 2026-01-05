'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import {
  User as UserIcon,
  Building2,
  Users,
  Mail,
  Shield,
  Trash2,
  Plus,
  Copy,
  Check,
  Key,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
} from '@/components/ui'
import type { UserProfile, Organization, Invitation } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface SettingsContentProps {
  user: User
  profile: (UserProfile & { organization: Organization }) | null
  members: Pick<UserProfile, 'id' | 'email' | 'name' | 'role' | 'created_at'>[]
  invitations: Invitation[]
}

export function SettingsContent({
  user,
  profile,
  members,
  invitations,
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre profil, votre organisation et votre équipe
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4 mr-2" />
            Organisation
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Équipe
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <ProfileSettings user={user} profile={profile} />
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <OrganizationSettings organization={profile?.organization} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamSettings 
            members={members} 
            invitations={invitations}
            organizationId={profile?.organization_id ?? undefined}
            currentUserId={user.id}
          />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecuritySettings user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Profile Settings Component
function ProfileSettings({
  user,
  profile,
}: {
  user: User
  profile: (UserProfile & { organization: Organization }) | null
}) {
  const [name, setName] = useState(profile?.name || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setLoading(true)
    setSuccess(false)

    const { error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', user.id)

    setLoading(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>
            Mettez à jour vos informations de profil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Adresse email"
            value={user.email || ''}
            disabled
            hint="L'email ne peut pas être modifié"
          />
          <Input
            label="Nom complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
          />
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} isLoading={loading}>
              Enregistrer
            </Button>
            {success && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Enregistré
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Zone dangereuse</CardTitle>
          <CardDescription>
            Actions irréversibles sur votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="danger">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Organization Settings Component
function OrganizationSettings({
  organization,
}: {
  organization: Organization | undefined
}) {
  const [name, setName] = useState(organization?.name || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    if (!organization) return
    setLoading(true)
    setSuccess(false)

    const { error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', organization.id)

    setLoading(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Détails de l'organisation</CardTitle>
          <CardDescription>
            Informations sur votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nom de l'organisation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de votre entreprise"
          />
          <Input
            label="Plan actuel"
            value={organization?.plan === 'free' ? 'Gratuit' : 'Premium'}
            disabled
          />
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} isLoading={loading}>
              Enregistrer
            </Button>
            {success && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Enregistré
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limites du plan</CardTitle>
          <CardDescription>
            Utilisation actuelle de votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-muted/30">
              <p className="text-2xl font-semibold">
                {organization?.max_workspaces || 3}
              </p>
              <p className="text-sm text-muted-foreground">Workspaces max</p>
            </div>
            <div className="p-4 bg-muted/30">
              <p className="text-2xl font-semibold">
                {organization?.plan === 'free' ? '1,000' : 'Illimité'}
              </p>
              <p className="text-sm text-muted-foreground">Messages/mois</p>
            </div>
            <div className="p-4 bg-muted/30">
              <p className="text-2xl font-semibold">
                {organization?.plan === 'free' ? '50 MB' : '1 GB'}
              </p>
              <p className="text-sm text-muted-foreground">Stockage documents</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Team Settings Component
function TeamSettings({
  members,
  invitations,
  organizationId,
  currentUserId,
}: {
  members: Pick<UserProfile, 'id' | 'email' | 'name' | 'role' | 'created_at'>[]
  invitations: Invitation[]
  organizationId: string | undefined
  currentUserId: string
}) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleInvite() {
    if (!organizationId || !inviteEmail) return
    setLoading(true)

    const { error } = await supabase.from('invitations').insert({
      organization_id: organizationId,
      email: inviteEmail,
      role: inviteRole,
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    setLoading(false)
    if (!error) {
      setShowInviteModal(false)
      setInviteEmail('')
      // Refresh page to show new invitation
      window.location.reload()
    }
  }

  async function handleCancelInvitation(id: string) {
    await supabase.from('invitations').delete().eq('id', id)
    window.location.reload()
  }

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membres de l'équipe</CardTitle>
              <CardDescription>
                Gérez les accès de votre équipe
              </CardDescription>
            </div>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowInviteModal(true)}
            >
              Inviter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{member.name || 'Sans nom'}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.role === 'owner' ? 'info' : 'default'}
                    >
                      {member.role === 'owner'
                        ? 'Propriétaire'
                        : member.role === 'admin'
                        ? 'Admin'
                        : 'Membre'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    {member.id !== currentUserId && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Retirer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {inv.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {inv.role === 'admin' ? 'Admin' : 'Membre'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleCancelInvitation(inv.id)}
                      >
                        Annuler
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Inviter un membre"
      >
        <div className="space-y-4">
          <Input
            label="Adresse email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="collegue@exemple.com"
          />
          <div>
            <label className="block text-sm font-medium mb-2">Rôle</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 focus:border-black focus:outline-none"
            >
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowInviteModal(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleInvite} isLoading={loading}>
              Envoyer l'invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Security Settings Component
function SecuritySettings({ user }: { user: User }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleChangePassword() {
    setError('')
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
          <CardDescription>
            Assurez-vous d'utiliser un mot de passe sécurisé
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={error}
          />
          <div className="flex items-center gap-4">
            <Button onClick={handleChangePassword} isLoading={loading}>
              Mettre à jour
            </Button>
            {success && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Mot de passe mis à jour
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions actives</CardTitle>
          <CardDescription>
            Gérez vos sessions de connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Session actuelle</p>
                <p className="text-sm text-muted-foreground">
                  Connecté depuis {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR')
                    : 'maintenant'}
                </p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
