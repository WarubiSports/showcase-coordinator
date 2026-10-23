// What the player sees when the link is unknown or the server is not reachable
export const InviteError = ({ kind }: { kind: 'not_found' | 'unavailable' }) =>
  kind === 'not_found' ? (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Dieser Link ist ungültig oder abgelaufen.</h1>
      <p className="text-gray-600">Melde dich bei der Person, von der du die Einladung bekommen hast.</p>
    </div>
  ) : (
    <p className="text-gray-600">Gerade nicht erreichbar. Bitte versuch es gleich noch einmal.</p>
  )
