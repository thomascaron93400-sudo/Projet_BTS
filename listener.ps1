# listener.ps1 — A lancer EN ADMINISTRATEUR
# Vérifie les mises à jour Windows 11 et demande confirmation pour les installer

$port = 8080

# Import du module nécessaire (doit être installé au préalable)
Import-Module PSWindowsUpdate -ErrorAction Stop

# Charge l'assembly pour les boites de dialogue
Add-Type -AssemblyName System.Windows.Forms

# ============================================================
# Fonction : vérifier MAJ et demander confirmation
# ============================================================
function Verifier-MisesAJour {
    Write-Host "$(Get-Date) - Recherche des mises a jour Windows..."

    try {
        # Récupère la liste des MAJ disponibles
        $updates = Get-WindowsUpdate -ErrorAction Stop

        if ($null -eq $updates -or $updates.Count -eq 0) {
            Write-Host "$(Get-Date) - Aucune mise a jour disponible"
            [System.Windows.Forms.MessageBox]::Show(
                "Aucune mise a jour Windows disponible.`nVotre systeme est a jour.",
                "Verification des mises a jour",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Information
            ) | Out-Null
            return
        }

        # Construit le message de la boite de dialogue
        $nbMaj = $updates.Count
        $tailleTotaleMo = [math]::Round(($updates | Measure-Object Size -Sum).Sum / 1MB, 1)

        $message = "Mises a jour Windows disponibles : $nbMaj`n"
        $message += "Taille totale : $tailleTotaleMo Mo`n`n"
        $message += "Liste des mises a jour :`n"

        # Affiche les 5 premieres pour eviter une boite trop grande
        $apercu = $updates | Select-Object -First 5
        foreach ($u in $apercu) {
            $titre = $u.Title
            if ($titre.Length -gt 70) { $titre = $titre.Substring(0, 70) + "..." }
            $message += "  - $titre`n"
        }
        if ($nbMaj -gt 5) {
            $message += "  ... et $($nbMaj - 5) autre(s)`n"
        }

        $message += "`nVoulez-vous installer ces mises a jour maintenant ?"

        # Affiche la boite de dialogue Oui / Non
        $reponse = [System.Windows.Forms.MessageBox]::Show(
            $message,
            "Mises a jour Windows disponibles",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Question
        )

        if ($reponse -eq [System.Windows.Forms.DialogResult]::Yes) {
            Write-Host "$(Get-Date) - Utilisateur a choisi OUI - installation en cours"
            [System.Windows.Forms.MessageBox]::Show(
                "Installation en cours...`nCela peut prendre plusieurs minutes.`nUn redemarrage peut etre necessaire.",
                "Installation",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Information
            ) | Out-Null

            # Installation des MAJ (sans redémarrage automatique)
            Install-WindowsUpdate -AcceptAll -IgnoreReboot -Confirm:$false

            Write-Host "$(Get-Date) - Installation terminee"
            [System.Windows.Forms.MessageBox]::Show(
                "Installation terminee.`nUn redemarrage peut etre necessaire pour finaliser.",
                "Termine",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Information
            ) | Out-Null
        }
        else {
            Write-Host "$(Get-Date) - Utilisateur a choisi NON - mises a jour reportees"
        }
    }
    catch {
        Write-Host "$(Get-Date) - ERREUR lors de la verification : $($_.Exception.Message)"
        [System.Windows.Forms.MessageBox]::Show(
            "Erreur lors de la verification des mises a jour :`n$($_.Exception.Message)",
            "Erreur",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    }
}

# ============================================================
# Boucle principale : listener HTTP
# ============================================================
while ($true) {
    try {
        $listener = [System.Net.HttpListener]::new()
        $listener.Prefixes.Add("http://+:$port/trigger/")
        $listener.Start()
        Write-Host "$(Get-Date) - Listener demarre sur le port $port"

        while ($listener.IsListening) {
            $context  = $listener.GetContext()
            $request  = $context.Request
            $response = $context.Response

            $reader = [System.IO.StreamReader]::new($request.InputStream)
            $body   = $reader.ReadToEnd()
            $data   = $body | ConvertFrom-Json
            Write-Host "$(Get-Date) - Alerte recue : $($data.source) - UID : $($data.uid) - Nom : $($data.nom)"

            # Repond immediatement OK au Pi (sinon il timeout)
            $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.OutputStream.Close()

            # Lance la verification des MAJ en arriere-plan
            # (pour ne pas bloquer le listener si l'utilisateur tarde a repondre)
            Start-Job -ScriptBlock {
                Import-Module PSWindowsUpdate
                Add-Type -AssemblyName System.Windows.Forms
                # On recopie la logique ici car les jobs ne voient pas les fonctions du parent
                $updates = Get-WindowsUpdate
                if ($null -eq $updates -or $updates.Count -eq 0) {
                    [System.Windows.Forms.MessageBox]::Show(
                        "Aucune mise a jour Windows disponible.",
                        "Verification des mises a jour",
                        "OK", "Information"
                    ) | Out-Null
                    return
                }
                $nbMaj = $updates.Count
                $tailleMo = [math]::Round(($updates | Measure-Object Size -Sum).Sum / 1MB, 1)
                $msg = "Mises a jour disponibles : $nbMaj`nTaille : $tailleMo Mo`n`nInstaller maintenant ?"
                $rep = [System.Windows.Forms.MessageBox]::Show($msg, "Windows Update", "YesNo", "Question")
                if ($rep -eq "Yes") {
                    Install-WindowsUpdate -AcceptAll -IgnoreReboot -Confirm:$false
                    [System.Windows.Forms.MessageBox]::Show("Installation terminee.", "Termine", "OK", "Information") | Out-Null
                }
            } | Out-Null

            Write-Host "$(Get-Date) - Verification MAJ lancee en arriere-plan"
        }
    }
    catch {
        Write-Host "$(Get-Date) - ERREUR : $($_.Exception.Message)"
        Write-Host "$(Get-Date) - Redemarrage dans 5 secondes..."
        try { $listener.Stop() } catch {}
        Start-Sleep -Seconds 5
    }
}