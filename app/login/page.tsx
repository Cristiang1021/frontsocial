'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { authenticate, isAuthenticated } from '@/lib/auth'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/overview')
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (authenticate(code)) {
      toast.success('Acceso concedido')
      // Check if there's a redirect parameter
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      router.push(redirect || '/overview')
    } else {
      toast.error('Código de acceso incorrecto')
      setCode('')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Acceso Restringido</CardTitle>
          <CardDescription className="text-center">
            Ingresa el código de acceso para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de Acceso</Label>
              <Input
                id="code"
                type="password"
                placeholder="Ingresa el código"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                disabled={loading}
                className="text-center text-lg tracking-widest"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !code}>
              {loading ? 'Verificando...' : 'Acceder'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
