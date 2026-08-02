"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { AvatarPicker } from "@/components/AvatarPicker";
import {
  renamePlayer,
  archivePlayer,
  updatePlayerAvatar,
  mergePlayers,
  searchExistingPlayers,
} from "@/app/players/actions";
import type { AvatarColor, AvatarShape } from "@/lib/avatar";

type Player = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
  is_guest: boolean;
};

type OtherPlayer = { id: string; name: string; archived: boolean };

export function PlayerRow({
  player,
  isMe,
  wins,
  otherPlayers,
}: {
  player: Player;
  isMe: boolean;
  wins: number;
  otherPlayers: OtherPlayer[];
}) {
  const [editing, setEditing] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [merging, setMerging] = useState(false);
  // Demandé dès l'ouverture plutôt que d'afficher liste locale + recherche
  // en même temps (source de confusion : on ne sait plus où chercher).
  const [mergeScope, setMergeScope] = useState<"same" | "other" | null>(null);
  // Jamais présélectionné : fusionner avec la mauvaise personne par erreur
  // (ex. cliquer "Fusionner" sans avoir remarqué qu'un premier candidat
  // était déjà choisi) serait dangereux — un choix explicite est obligatoire.
  const [mergeTarget, setMergeTarget] = useState("");
  // Laquelle des deux fiches garder active après fusion : la fiche cliquée
  // (celle-ci) n'a pas forcément l'historique le plus utile — ex. un compte
  // lié mais archivé vs. une fiche sans compte mais avec toutes les parties.
  const [keepSelf, setKeepSelf] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Doublon entre DEUX ligues différentes (ex. un compte a une fiche par
  // ligue avant de devenir global) : le doublon n'apparaît pas dans
  // otherPlayers (limité à la ligue active), donc recherche à la demande.
  const [crossLeagueQuery, setCrossLeagueQuery] = useState("");
  const [crossLeagueResults, setCrossLeagueResults] = useState<OtherPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mergeCandidates =
    mergeScope === "same" ? otherPlayers : mergeScope === "other" ? crossLeagueResults : [];

  async function handleCrossLeagueSearch(query: string) {
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchExistingPlayers(query);
      setCrossLeagueResults(
        found.map((f) => ({ id: f.id, name: `${f.name} (${f.league_name})`, archived: false })),
      );
      setSearched(true);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "La recherche a échoué.");
    } finally {
      setSearching(false);
    }
  }

  function pickScope(scope: "same" | "other") {
    setMergeScope(scope);
    setMergeTarget("");
    if (scope === "other") {
      // Cherche tout de suite sur des pseudos approchants (le nom de la
      // fiche elle-même) plutôt que de laisser un champ vide à remplir.
      setCrossLeagueQuery(player.name);
      handleCrossLeagueSearch(player.name);
    }
  }

  async function handleMerge() {
    const other = mergeCandidates.find((p) => p.id === mergeTarget);
    if (!other) return;
    const [survivor, absorbed] = keepSelf ? [player, other] : [other, player];
    if (
      !confirm(
        `Toutes les parties de ${absorbed.name} seront rattachées à ${survivor.name}, dans toutes les ligues concernées. ${absorbed.name} ne sera plus visible nulle part. Confirmer ?`,
      )
    ) {
      return;
    }
    setPending(true);
    setMergeError(null);
    const result = await mergePlayers(absorbed.id, survivor.id);
    setPending(false);
    if (result?.error) {
      setMergeError(result.error);
      return;
    }
    setMerging(false);
  }

  async function handleArchive() {
    if (
      !confirm(
        `Supprimer ${player.name} ? Son historique de parties est conservé, mais il n'apparaîtra plus dans les listes.`,
      )
    ) {
      return;
    }
    setPending(true);
    await archivePlayer(player.id);
    setPending(false);
  }

  async function handleAvatarSave(color: AvatarColor, shape: AvatarShape) {
    await updatePlayerAvatar(player.id, color, shape);
    setPickingAvatar(false);
  }

  const avatarButton = (
    <button
      type="button"
      onClick={() => setPickingAvatar(true)}
      aria-label={`Changer l'avatar de ${player.name}`}
    >
      <AvatarBadge color={player.avatar_color} shape={player.avatar_shape} size={38} />
    </button>
  );

  if (editing) {
    return (
      <>
        <form
          action={async (formData) => {
            setPending(true);
            await renamePlayer(player.id, String(formData.get("name") ?? ""));
            setPending(false);
            setEditing(false);
          }}
          className="card flex items-center gap-2 py-3"
        >
          {avatarButton}
          <input
            name="name"
            defaultValue={player.name}
            autoFocus
            className="input-field flex-1"
          />
          <button type="submit" disabled={pending} className="btn-secondary">
            OK
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="btn-ghost"
          >
            Annuler
          </button>
        </form>
        {pickingAvatar && (
          <AvatarPicker
            initialColor={player.avatar_color}
            initialShape={player.avatar_shape}
            onCancel={() => setPickingAvatar(false)}
            onSave={handleAvatarSave}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="card flex items-center gap-2 py-3">
        {avatarButton}
        <div className="flex flex-1 flex-col">
          <span className="font-quicksand text-base font-medium text-onjoo-green-900">
            {player.name}
          </span>
          <div className="flex items-center gap-1.5 font-quicksand text-xs text-[#777]">
            {isMe && <span>Toi</span>}
            {!isMe && player.is_guest && <span>Invité</span>}
            {(isMe || player.is_guest) && <span>·</span>}
            <span>
              🏆 {wins} victoire{wins > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          aria-label={`Renommer ${player.name}`}
          className="rounded-lg p-1.5 text-base"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => {
            setMergeError(null);
            setKeepSelf(false);
            setMergeScope(null);
            setMergeTarget("");
            setCrossLeagueResults([]);
            setCrossLeagueQuery("");
            setSearched(false);
            setMerging(true);
          }}
          disabled={pending}
          aria-label={`Fusionner ${player.name} avec une autre fiche`}
          className="rounded-lg p-1.5 text-base"
        >
          ⇄
        </button>
        <button
          type="button"
          onClick={handleArchive}
          disabled={pending}
          aria-label={`Supprimer ${player.name}`}
          className="rounded-lg p-1.5 text-base text-onjoo-red-500"
        >
          🗑
        </button>
      </div>
      {pickingAvatar && (
        <AvatarPicker
          initialColor={player.avatar_color}
          initialShape={player.avatar_shape}
          onCancel={() => setPickingAvatar(false)}
          onSave={handleAvatarSave}
        />
      )}
      {merging && (
        <div className="card flex flex-col gap-3">
          <h3 className="font-fredoka text-base font-semibold text-onjoo-green-900">
            Fusionner {player.name} avec…
          </h3>

          <p className="font-quicksand text-xs font-semibold text-onjoo-green-900">
            Le doublon est où ?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pickScope("same")}
              className={`flex-1 rounded-lg border-2 px-3 py-2 font-quicksand text-sm font-bold ${
                mergeScope === "same"
                  ? "border-onjoo-green-900 text-onjoo-green-900"
                  : "border-[#ddd] text-[#999]"
              }`}
            >
              Dans cette ligue
            </button>
            <button
              type="button"
              onClick={() => pickScope("other")}
              className={`flex-1 rounded-lg border-2 px-3 py-2 font-quicksand text-sm font-bold ${
                mergeScope === "other"
                  ? "border-onjoo-green-900 text-onjoo-green-900"
                  : "border-[#ddd] text-[#999]"
              }`}
            >
              Dans une autre ligue
            </button>
          </div>

          {mergeScope === "same" && otherPlayers.length === 0 && (
            <p className="font-quicksand text-xs text-[#777]">
              Aucun autre joueur dans cette ligue.
            </p>
          )}

          {mergeScope === "other" && (
            <div className="flex gap-2">
              <input
                value={crossLeagueQuery}
                onChange={(event) => setCrossLeagueQuery(event.target.value)}
                placeholder="Nom du joueur…"
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={() => handleCrossLeagueSearch(crossLeagueQuery)}
                disabled={searching || crossLeagueQuery.trim().length < 2}
                className="btn-ghost"
              >
                {searching ? "..." : "Chercher"}
              </button>
            </div>
          )}
          {searchError && (
            <p className="font-quicksand text-xs font-semibold text-onjoo-red-500">
              {searchError}
            </p>
          )}
          {mergeScope === "other" && searched && !searching && crossLeagueResults.length === 0 && !searchError && (
            <p className="font-quicksand text-xs text-[#777]">
              Aucun joueur trouvé dans tes autres ligues pour « {crossLeagueQuery} ».
            </p>
          )}

          {mergeCandidates.length > 0 && (
            <select
              value={mergeTarget}
              onChange={(event) => setMergeTarget(event.target.value)}
              className="input-field"
            >
              <option value="">— Choisir —</option>
              {mergeCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.archived ? " (archivée)" : ""}
                </option>
              ))}
            </select>
          )}

          {(() => {
            const other = mergeCandidates.find((p) => p.id === mergeTarget);
            if (!other) return null;
            const [survivor, absorbed] = keepSelf ? [player, other] : [other, player];
            return (
              <>
                <p className="font-quicksand text-xs font-semibold text-onjoo-green-900">
                  Quelle fiche garder active ?
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 font-quicksand text-sm text-[#666]">
                    <input
                      type="radio"
                      name="keep"
                      checked={!keepSelf}
                      onChange={() => setKeepSelf(false)}
                    />
                    {other.name}
                    {other.archived ? " (archivée)" : ""}
                  </label>
                  <label className="flex items-center gap-2 font-quicksand text-sm text-[#666]">
                    <input
                      type="radio"
                      name="keep"
                      checked={keepSelf}
                      onChange={() => setKeepSelf(true)}
                    />
                    {player.name}
                  </label>
                </div>
                <p className="font-quicksand text-xs text-[#777]">
                  Toutes les parties de {absorbed.name} seront rattachées à {survivor.name}, dans
                  toutes les ligues concernées. {absorbed.name} ne sera plus visible nulle part.
                </p>
              </>
            );
          })()}
          {mergeError && (
            <p className="font-quicksand text-xs font-semibold text-onjoo-red-500">
              {mergeError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMerge}
              disabled={pending || !mergeTarget}
              className="btn-secondary flex-1"
            >
              Fusionner
            </button>
            <button
              type="button"
              onClick={() => setMerging(false)}
              disabled={pending}
              className="btn-ghost flex-1"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
}
