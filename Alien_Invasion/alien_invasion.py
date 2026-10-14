import sys
import asyncio
from time import sleep
import pygame
from settings import Settings
from game_stats import GameStats
from scoreboard import Scoreboard
from button import Button
from ship import Ship
from bullet import Bullet
from alien import Alien
class AlienInvasion:
    
    """Overall class to manage game assets and behavior."""
    def __init__(self):
        """Initialize the game, and create game resources."""
        pygame.init()
        self.clock = pygame.time.Clock()
        self.settings = Settings()                 #instances creation
        self.screen = pygame.display.set_mode((self.settings.screen_width, self.settings.screen_height))
        self.settings.screen_width = self.screen.get_rect().width
        self.settings.screen_height = self.screen.get_rect().height
        pygame.display.set_caption("Alien Invasion")
        # Create an instance to store game statistics,
        #   and create a scoreboard.
        self.stats = GameStats(self)
        self.sb = Scoreboard(self)
        self.ship = Ship(self)          #instance created to be use as required BELOW, self is used for automatic calling
        self.bullets = pygame.sprite.Group()   #instances creation  , CONT... as otherwisewe need to use print command 
        self.aliens = pygame.sprite.Group()  # instances creation, CONT.... instead
        self._create_fleet()
        # Start Alien Invasion in an inactive state.
        self.game_active = False
        # Make the Play button.
        self.play_button = Button(self, "Play")
    async def run_game(self):
        """Start the main loop for the game."""
        while True:
            self._check_events()
            if self.game_active:
                self.ship.update()                
                self._update_bullets()
                self._update_aliens()
            self._update_screen()
            self.clock.tick(144)
            await asyncio.sleep(0)
            
    # Watch for keyboard and mouse events.
    def _check_events(self):
        for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    sys.exit()
                elif event.type == pygame.KEYDOWN:
                    self._check_keydown_events(event)
                elif event.type == pygame.KEYUP:
                    self._check_keyup_events(event)
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    mouse_pos = pygame.mouse.get_pos()
                    self._check_play_button(mouse_pos)

    def _check_play_button(self, mouse_pos):
        """Start a new game when the player clicks Play."""
        button_clicked = self.play_button.rect.collidepoint(mouse_pos)
        if button_clicked and not self.game_active:              # Note  "and not" for future use.
            # Reset the game settings.
            self.settings.initialize_dynamic_settings()
            # Reset the game statistics.
            self.stats.reset_stats()
            self.sb.prep_score()
            self.sb.prep_level()
            self.sb.prep_ships()
            self.game_active = True
            # Get rid of any remaining bullets and aliens.
            self.bullets.empty()
            self.aliens.empty()
            # Create a new fleet and center the ship.
            self._create_fleet()
            self.ship.center_ship()
            # Hide the mouse cursor.
            pygame.mouse.set_visible(False)
            
    def _check_keydown_events(self, event):
        """Respond to keypresses."""
        if event.key == pygame.K_RIGHT:
            self.ship.moving_right = True
        elif event.key == pygame.K_LEFT:
            self.ship.moving_left = True
        elif event.key == pygame.K_SPACE:
            self._fire_bullet()
        elif event.key == pygame.K_q:
            sys.exit()
            
    def _check_keyup_events(self, event):
        """Respond to key releases."""
        if event.key == pygame.K_RIGHT:
            self.ship.moving_right = False
        elif event.key == pygame.K_LEFT:
            self.ship.moving_left = False
            
    def _fire_bullet(self):
        """Create a new bullet and add it to the bullets group."""
        new_bullet = Bullet(self)
        self.bullets.add(new_bullet)
        
    def _update_aliens(self):
        """Check if the fleet is at an edge, then update positions."""
        self._check_fleet_edges()
        self.aliens.update()
        # Look for alien-ship collisions.
        if pygame.sprite.spritecollideany(self.ship, self.aliens):              # 1st argument = a sprite
            self._ship_hit()                                                                                # 2nd argument = a group (its all members within
        # Look for aliens hitting the bottom of the screen.                                                                           group)
        self._check_aliens_bottom()
    # Redraw the screen during each pass through the loop.
    def _update_bullets(self):
        """Update position of bullets and get rid of old bullets."""
        # Update bullet positions.
        self.bullets.update()
        # Get rid of bullets that have disappeared.
        for bullet in self.bullets.copy():
            if bullet.rect.bottom <= 0:
                self.bullets.remove(bullet)
        self._check_bullet_alien_collisions()
        
    def _check_bullet_alien_collisions(self):
        
        """Respond to bullet-alien collisions."""
        # Remove any bullets and aliens that have collided.
        # Check for any bullets that have hit aliens.
        #   If so, get rid of the bullet and the alien.
        collisions = pygame.sprite.groupcollide(
                self.bullets, self.aliens, True , True)           # The both True's have RESPECTIVE aspects.

        if collisions:
            for aliens in collisions.values():
                self.stats.score += self.settings.alien_points * len(aliens)
            self.sb.prep_score()
            self.sb.check_high_score()
            
        if not self.aliens:
            
            # Destroy existing bullets and create new fleet.
            self.bullets.empty()
            self._create_fleet()
            self.settings.increase_speed()

            # Increase level.
            self.stats.level += 1
            self.sb.prep_level()
            
    def _create_fleet(self):
        """Create the fleet of aliens."""
        # Create an alien and keep adding aliens until there's no room left.
        # Spacing between aliens is one alien width and one alien height.
        
        alien = Alien(self)                 #self is used for automatically calling
        alien_width, alien_height = alien.rect.size
        current_x, current_y = alien_width, alien_height
        while current_y < (self.settings.screen_height - 3 * alien_height):
            while current_x < (self.settings.screen_width - 2 * alien_width):
                self._create_alien(current_x,current_y)            # calling helper not making instances
                current_x += 2 * alien_width
            # Finished a row; reset x value, and increment y value.
            current_x = alien_width               # it's for new row(y) as it's outside of inner loop
            current_y += 2 * alien_height
            
    def _create_alien(self, x_position,y_position):
            """Create an alien and place it in the row."""
            new_alien = Alien(self)
            new_alien.x = x_position
            new_alien.rect.x = x_position
            new_alien.rect.y = y_position
            self.aliens.add(new_alien)

    def _check_fleet_edges(self):
        """Respond appropriately if any aliens have reached an edge."""
        for alien in self.aliens.sprites():
            if alien.check_edges():
                 self._change_fleet_direction()          # Here , also order doesn't matter But it does ONLY in run_game.
                 break                                                     # i.e starting loop here is while loop at  the top.
            
    def _change_fleet_direction(self):
        """Drop the entire fleet and change the fleet's direction."""
        for alien in self.aliens.sprites():
            alien.rect.y += self.settings.fleet_drop_speed
        self.settings.fleet_direction *= -1                #updating the value for other direction.

    def _ship_hit(self):
        """Respond to the ship being hit by an alien."""
        if self.stats.ships_left >  0:
            # Decrement ships_left, and update scoreboard.
            self.stats.ships_left -= 1
            self.sb.prep_ships()    
            # Get rid of any remaining bullets and aliens.
            self.bullets.empty()
            self.aliens.empty()
            # Create a new fleet and center the ship.
            self._create_fleet()
            self.ship.center_ship()
            # Pause.
            sleep(0.8)
        else:
            self.game_active = False
            pygame.mouse.set_visible(True)
            
    def _check_aliens_bottom(self):
        """Check if any aliens have reached the bottom of the screen."""
        for alien in self.aliens.sprites():
             if alien.rect.bottom >= self.settings.screen_height:
                # Treat this the same as if the ship got hit.
                self._ship_hit()
                break
            
    def _update_screen(self):
        self.screen.fill(self.settings.bg_color)
        self.ship.blitme()                                                              #INSTANCES TOO (SELF.SHIP)
        self.aliens.draw(self.screen)     #INSTANCES TOO  (SELF.ALIENS)
        # Draw the score information.
        self.sb.show_score()
        # Draw the play button if the game is inactive.
        
        if not self.game_active:
            self.play_button.draw_button()
        for bullet in self.bullets.sprites():
            bullet.draw_bullet()
            
        # Make the most recently drawn screen visible.
        pygame.display.flip()
        
async def main():
    ai = AlienInvasion()
    await ai.run_game()

if __name__ == '__main__':
    asyncio.run(main())
