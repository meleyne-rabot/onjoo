import { AvatarBadge } from "@/components/AvatarBadge";

type PlayerLite = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
  avatar_url?: string | null;
};

export function PlayerPicker({ players }: { players: PlayerLite[] }) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((player) => (
        <label
          key={player.id}
          className="card flex items-center gap-3 has-[:checked]:border-onjoo-green-900"
        >
          <input
            type="checkbox"
            name="player_ids"
            value={player.id}
            defaultChecked
            className="h-5 w-5"
          />
          <AvatarBadge
            color={player.avatar_color}
            shape={player.avatar_shape}
            avatarUrl={player.avatar_url}
            size={36}
          />
          <span className="font-quicksand text-base font-medium text-onjoo-green-900">
            {player.name}
          </span>
        </label>
      ))}
      {players.length === 0 && (
        <p className="font-quicksand text-sm text-[#777]">
          Aucun joueur dans la ligue pour l&apos;instant.
        </p>
      )}
    </div>
  );
}
